use actix_web::{post, web, HttpRequest, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::models::{OrganizationAddMemberIn, OrganizationOut};
use crate::server::AppState;

/// Add a user to an organization by email (owner-only).
#[post("/api/organizations/{id}/members")]
pub async fn organizations_add_member(
    data: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<OrganizationAddMemberIn>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let org_id = match ObjectId::parse_str(&path.into_inner()) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    let email = body.email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid email");
    }

    let org = match data.organizations.find_one(doc! { "_id": org_id }).await {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Organization not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    if org.owner_id != user_id {
        return respond::error(actix_web::http::StatusCode::FORBIDDEN, "Only the owner can add members");
    }

    let user = match data.users.find_one(doc! { "email": &email }).await {
        Ok(Some(u)) => u,
        Ok(None) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "User not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    let updated = match data
        .organizations
        .find_one_and_update(
            doc! { "_id": org_id },
            doc! { "$addToSet": { "memberIds": user.id } },
        )
        .return_document(mongodb::options::ReturnDocument::After)
        .await
    {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Organization not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    respond::ok_json(OrganizationOut::from(updated))
}

