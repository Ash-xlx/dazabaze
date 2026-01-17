use actix_web::{delete, web, HttpRequest, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::server::AppState;

#[delete("/api/issues/{id}")]
pub async fn issues_delete(
    data: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let issue_id = match ObjectId::parse_str(&path.into_inner()) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    let issue = match data.issues.find_one(doc! { "_id": issue_id }).await {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Issue not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    // membership check
    let member = match data
        .organizations
        .find_one(doc! { "_id": issue.organization_id, "memberIds": user_id })
        .await
    {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };
    if !member {
        return respond::error(actix_web::http::StatusCode::FORBIDDEN, "Not a member of this organization");
    }

    let deleted = match data.issues.find_one_and_delete(doc! { "_id": issue_id }).await {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };
    if deleted.is_none() {
        return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Issue not found");
    }

    respond::ok_json(serde_json::json!({ "ok": true }))
}

