use mongodb::{
    bson::{doc, oid::ObjectId},
    options::{ClientOptions, IndexOptions},
    Client, IndexModel,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct UserDb {
    #[serde(rename = "_id")]
    id: ObjectId,
    email: String,
    name: String,
    password_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OrganizationDb {
    #[serde(rename = "_id")]
    id: ObjectId,
    name: String,
    key: String,
    #[serde(rename = "ownerId")]
    owner_id: ObjectId,
    #[serde(rename = "memberIds")]
    member_ids: Vec<ObjectId>,
}

#[derive(Debug, Serialize, Deserialize)]
struct IssueDb {
    #[serde(rename = "_id")]
    id: ObjectId,
    #[serde(rename = "organizationId")]
    organization_id: ObjectId,
    title: String,
    description: String,
    status: String,
    #[serde(rename = "parentIssueId")]
    parent_issue_id: Option<ObjectId>,
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    backend::env::load_env();

    let mongo_uri = backend::env::require_var("MONGO_URI")?;
    let mongo_db = env_or("MONGO_DB", "dazabaze");

    let client_options = ClientOptions::parse(&mongo_uri).await?;
    let client = Client::with_options(client_options)?;
    let db = client.database(&mongo_db);

    let users = db.collection::<UserDb>("users");
    let organizations = db.collection::<OrganizationDb>("organizations");
    let issues = db.collection::<IssueDb>("issues");

    users.delete_many(doc! {}).await?;
    organizations.delete_many(doc! {}).await?;
    issues.delete_many(doc! {}).await?;

    // Users (for login) - 5 docs
    // Password for all seeded users: Password123!
    let password_hash = bcrypt::hash("Password123!", bcrypt::DEFAULT_COST)?;
    let user_docs = vec![
        UserDb { id: ObjectId::new(), email: "alice@example.com".into(), name: "Alice".into(), password_hash: password_hash.clone() },
        UserDb { id: ObjectId::new(), email: "boris@example.com".into(), name: "Boris".into(), password_hash: password_hash.clone() },
        UserDb { id: ObjectId::new(), email: "cecilie@example.com".into(), name: "Cecilie".into(), password_hash: password_hash.clone() },
        UserDb { id: ObjectId::new(), email: "david@example.com".into(), name: "David".into(), password_hash: password_hash.clone() },
        UserDb { id: ObjectId::new(), email: "eva@example.com".into(), name: "Eva".into(), password_hash: password_hash.clone() },
    ];
    users.insert_many(&user_docs).await?;

    // Organizations (required collection) - 5 docs
    let owner_id = user_docs[0].id;
    let org_docs = vec![
        OrganizationDb { id: ObjectId::new(), name: "Acme".into(), key: "ACME".into(), owner_id, member_ids: vec![owner_id] },
        OrganizationDb { id: ObjectId::new(), name: "Orbit".into(), key: "ORBT".into(), owner_id, member_ids: vec![owner_id] },
        OrganizationDb { id: ObjectId::new(), name: "Nimbus".into(), key: "NIMB".into(), owner_id, member_ids: vec![owner_id] },
        OrganizationDb { id: ObjectId::new(), name: "Kite".into(), key: "KITE".into(), owner_id, member_ids: vec![owner_id] },
        OrganizationDb { id: ObjectId::new(), name: "Vertex".into(), key: "VRTX".into(), owner_id, member_ids: vec![owner_id] },
    ];
    organizations.insert_many(&org_docs).await?;

    // Issues (required collection) - 5+ docs (including some sub-issues)
    let org0 = org_docs[0].id;
    let org1 = org_docs[1].id;

    let parent1 = ObjectId::new();
    let parent2 = ObjectId::new();

    let issue_docs = vec![
        IssueDb { id: parent1, organization_id: org0, title: "Set up project".into(), description: "Initialize repo, CI, and basic structure.".into(), status: "todo".into(), parent_issue_id: None },
        IssueDb { id: ObjectId::new(), organization_id: org0, title: "Create login screen".into(), description: "Add login UI and token storage.".into(), status: "in_progress".into(), parent_issue_id: Some(parent1) },
        IssueDb { id: ObjectId::new(), organization_id: org0, title: "Create organization flow".into(), description: "Allow creating org and switching between orgs.".into(), status: "todo".into(), parent_issue_id: Some(parent1) },
        IssueDb { id: parent2, organization_id: org1, title: "Issue search".into(), description: "Add MongoDB text index search on issues.".into(), status: "todo".into(), parent_issue_id: None },
        IssueDb { id: ObjectId::new(), organization_id: org1, title: "Sub-issues".into(), description: "Support parentIssueId and show children in Details.".into(), status: "todo".into(), parent_issue_id: Some(parent2) },
        IssueDb { id: ObjectId::new(), organization_id: org1, title: "Polish UI".into(), description: "Make it feel like Linear: fast, clean, keyboard-friendly.".into(), status: "backlog".into(), parent_issue_id: None },
    ];
    issues.insert_many(&issue_docs).await?;

    // Text index requirement on issues
    let issues_text_index = IndexModel::builder()
        .keys(doc! { "title": "text", "description": "text" })
        .options(
            IndexOptions::builder()
                .name("issues_text_search".to_string())
                .build(),
        )
        .build();
    issues.create_index(issues_text_index).await?;

    // Helpful indexes
    issues
        .create_index(IndexModel::builder().keys(doc! { "organizationId": 1 }).build())
        .await?;
    issues
        .create_index(IndexModel::builder().keys(doc! { "parentIssueId": 1 }).build())
        .await?;

    println!("Seed complete. DB={}", mongo_db);
    Ok(())
}

