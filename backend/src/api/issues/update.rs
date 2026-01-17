use actix_web::{put, web, HttpRequest, Responder};
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::options::ReturnDocument;

use crate::api::respond;
use crate::auth;
use crate::models::{IssueIn, IssueOut};
use crate::server::AppState;

fn validate_issue(body: &IssueIn) -> Result<(), &'static str> {
    if body.organization_id.trim().is_empty()
        || body.title.trim().is_empty()
        || body.description.trim().is_empty()
        || body.status.trim().is_empty()
    {
        return Err("organizationId, title, description, status are required");
    }
    Ok(())
}

#[put("/api/issues/{id}")]
pub async fn issues_update(
    data: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<IssueIn>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let issue_id = match ObjectId::parse_str(&path.into_inner()) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    let body = body.into_inner();
    if let Err(msg) = validate_issue(&body) {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, msg);
    }

    let org_id = match ObjectId::parse_str(&body.organization_id) {
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

    let parent_oid = match body.parent_issue_id {
        Some(s) => match ObjectId::parse_str(&s) {
            Ok(v) => Some(v),
            Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid parentIssueId"),
        },
        None => None,
    };

    if let Some(pid) = parent_oid {
        let parent = match data
            .issues
            .find_one(doc! { "_id": pid, "organizationId": org_id })
            .await
        {
            Ok(v) => v,
            Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
        };
        if parent.is_none() {
            return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "parentIssueId not found in organization");
        }
    }

    let update = doc! {
        "$set": {
            "organizationId": org_id,
            "title": body.title,
            "description": body.description,
            "status": body.status,
            "parentIssueId": parent_oid
        }
    };

    let updated = match data
        .issues
        .find_one_and_update(doc! { "_id": issue_id }, update)
        .return_document(ReturnDocument::After)
        .await
    {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Issue not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    respond::ok_json(IssueOut::from(updated))
}

