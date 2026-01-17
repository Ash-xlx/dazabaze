use actix_web::{get, web, HttpRequest, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::models::IssueOut;
use crate::server::AppState;

#[get("/api/issues/{id}")]
pub async fn issues_get_by_id(
    data: web::Data<AppState>,
    req: HttpRequest,
    id: web::Path<String>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let oid = match ObjectId::parse_str(&id.into_inner()) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    let issue = match data.issues.find_one(doc! { "_id": oid }).await {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Issue not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    // membership check against organizationId from issue
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

    respond::ok_json(IssueOut::from(issue))
}

