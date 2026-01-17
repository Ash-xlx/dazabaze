use actix_web::{delete, web, HttpRequest, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::server::AppState;

/// Delete an organization (owner-only).
/// Also deletes all issues that belong to this organization.
#[delete("/api/organizations/{id}")]
pub async fn organizations_delete(
    data: web::Data<AppState>,
    req: HttpRequest,
    id: web::Path<String>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let org_id = match ObjectId::parse_str(&id.into_inner()) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    let org = match data.organizations.find_one(doc! { "_id": org_id }).await {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Organization not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    if org.owner_id != user_id {
        return respond::error(actix_web::http::StatusCode::FORBIDDEN, "Only the owner can delete the organization");
    }

    // delete issues first (best effort)
    if let Err(_) = data.issues.delete_many(doc! { "organizationId": org_id }).await {
        return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error");
    }

    if let Err(_) = data.organizations.delete_one(doc! { "_id": org_id }).await {
        return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error");
    }

    respond::ok_json(serde_json::json!({ "ok": true }))
}

