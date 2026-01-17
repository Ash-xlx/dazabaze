use actix_web::{get, web, HttpRequest, Responder};
use futures_util::TryStreamExt;
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::models::{IssueOut, SearchQuery};
use crate::server::AppState;

#[get("/api/issues/search")]
pub async fn issues_search(
    data: web::Data<AppState>,
    req: HttpRequest,
    query: web::Query<SearchQuery>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let q = query.q.clone().unwrap_or_default();
    let q = q.trim().to_string();
    if q.is_empty() {
        return respond::ok_json(Vec::<IssueOut>::new());
    }

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

    let mut cursor = match data
        .issues
        .find(doc! { "$text": { "$search": q }, "organizationId": org_id })
        .sort(doc! { "score": { "$meta": "textScore" } })
        .projection(doc! { "score": { "$meta": "textScore" } })
        .limit(50)
        .await
    {
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

