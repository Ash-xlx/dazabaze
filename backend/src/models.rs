use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

// Data models for MongoDB + API DTOs.
//
// Semester rubric mapping:
// - Collections: `organizations`, `issues` (plus `users` for login)
// - Common field: `issues.organizationId` references `organizations._id`
// - Text index: created on `issues.title` + `issues.description` (see `bin/seed.rs`)

#[derive(Debug, Serialize, Deserialize)]
pub struct UserDb {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub email: String,
    pub name: String,
    pub password_hash: String,
}

#[derive(Debug, Serialize)]
pub struct UserOut {
    #[serde(rename = "_id")]
    pub id: String,
    pub email: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct SignupIn {
    pub email: String,
    pub name: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginIn {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthOut {
    pub token: String,
    pub user: UserOut,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizationDb {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub name: String,
    pub key: String,
    #[serde(rename = "ownerId")]
    pub owner_id: ObjectId,
    #[serde(rename = "memberIds")]
    pub member_ids: Vec<ObjectId>,
}

#[derive(Debug, Serialize)]
pub struct OrganizationOut {
    #[serde(rename = "_id")]
    pub id: String,
    pub name: String,
    pub key: String,
    #[serde(rename = "ownerId")]
    pub owner_id: String,
    #[serde(rename = "memberIds")]
    pub member_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct OrganizationCreateIn {
    pub name: String,
    pub key: String,
}

#[derive(Debug, Deserialize)]
pub struct OrganizationAddMemberIn {
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IssueDb {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    #[serde(rename = "organizationId")]
    pub organization_id: ObjectId,
    pub title: String,
    pub description: String,
    pub status: String,
    #[serde(rename = "parentIssueId")]
    pub parent_issue_id: Option<ObjectId>,
}

#[derive(Debug, Serialize)]
pub struct IssueOut {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    #[serde(rename = "parentIssueId")]
    pub parent_issue_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct IssueIn {
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    #[serde(rename = "parentIssueId")]
    pub parent_issue_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    #[serde(rename = "organizationId")]
    pub organization_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListIssuesQuery {
    #[serde(rename = "organizationId")]
    pub organization_id: Option<String>,
    #[serde(rename = "parentIssueId")]
    pub parent_issue_id: Option<String>,
}

impl From<UserDb> for UserOut {
    fn from(u: UserDb) -> Self {
        Self {
            id: u.id.to_hex(),
            email: u.email,
            name: u.name,
        }
    }
}

impl From<OrganizationDb> for OrganizationOut {
    fn from(o: OrganizationDb) -> Self {
        Self {
            id: o.id.to_hex(),
            name: o.name,
            key: o.key,
            owner_id: o.owner_id.to_hex(),
            member_ids: o.member_ids.into_iter().map(|x| x.to_hex()).collect(),
        }
    }
}

impl From<IssueDb> for IssueOut {
    fn from(i: IssueDb) -> Self {
        Self {
            id: i.id.to_hex(),
            organization_id: i.organization_id.to_hex(),
            title: i.title,
            description: i.description,
            status: i.status,
            parent_issue_id: i.parent_issue_id.map(|x| x.to_hex()),
        }
    }
}

