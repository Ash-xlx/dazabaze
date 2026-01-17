use actix_web::{get, web, HttpRequest, Responder};
use futures_util::TryStreamExt;
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::models::{IssueOut, ListIssuesQuery};
use crate::server::AppState;

#[get("/api/issues")]
pub async fn issues_list(
    data: web::Data<AppState>,
    req: HttpRequest,
    query: web::Query<ListIssuesQuery>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let Some(org_id_str) = query.organization_id.clone() else {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "organizationId is required");
    };
    let org_id = match ObjectId::parse_str(&org_id_str) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid organizationId"),
    };

    // membership check
    let member = match data
        .organizations
        .find_one(doc! { "_id": org_id, "memberIds": user_id })
        .await
    {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };
    if !member {
        return respond::error(actix_web::http::StatusCode::FORBIDDEN, "Not a member of this organization");
    }

    let mut filter = doc! { "organizationId": org_id };
    if let Some(parent_str) = query.parent_issue_id.clone() {
        let parent_oid = match ObjectId::parse_str(&parent_str) {
            Ok(v) => v,
            Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid parentIssueId"),
        };
        filter.insert("parentIssueId", parent_oid);
    }

    let mut cursor = match data.issues.find(filter).sort(doc! { "_id": -1 }).await {
        Ok(c) => c,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    let mut out: Vec<IssueOut> = Vec::new();
    while let Some(issue) = match cursor.try_next().await {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    } {
        out.push(IssueOut::from(issue));
    }

    respond::ok_json(out)
}

