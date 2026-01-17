use actix_web::{post, web, HttpRequest, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::models::{IssueDb, IssueIn, IssueOut};
use crate::server::AppState;

fn normalize_status(status: &str) -> Option<&'static str> {
    match status {
        "todo" => Some("todo"),
        "in_progress" => Some("in_progress"),
        "in_review" => Some("in_review"),
        // legacy alias
        "backlog" => Some("in_review"),
        "done" => Some("done"),
        _ => None,
    }
}

fn validate_issue(body: &IssueIn) -> Result<(), &'static str> {
    if body.organization_id.trim().is_empty()
        || body.title.trim().is_empty()
        || body.description.trim().is_empty()
        || body.status.trim().is_empty()
    {
        return Err("organizationId, title, description, status are required");
    }
    if normalize_status(body.status.trim()).is_none() {
        return Err("Invalid status");
    }
    Ok(())
}

#[post("/api/issues")]
pub async fn issues_create(
    data: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<IssueIn>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let body = body.into_inner();
    if let Err(msg) = validate_issue(&body) {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, msg);
    }

    let org_id = match ObjectId::parse_str(&body.organization_id) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid organizationId"),
    };

    // membership check (and load org for memberIds validation)
    let org = match data
        .organizations
        .find_one(doc! { "_id": org_id, "memberIds": user_id })
        .await
    {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::FORBIDDEN, "Not a member of this organization"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    let assignee_oid = match body.assignee_id {
        Some(s) => {
            let s = s.trim();
            if s.is_empty() {
                None
            } else {
                let oid = match ObjectId::parse_str(s) {
                    Ok(v) => v,
                    Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid assigneeId"),
                };
                if !org.member_ids.contains(&oid) {
                    return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "assigneeId must be a member of the organization");
                }
                Some(oid)
            }
        }
        None => None,
    };

    let status = match normalize_status(body.status.trim()) {
        Some(v) => v.to_string(),
        None => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid status"),
    };

    let parent_oid = match body.parent_issue_id {
        Some(s) => match ObjectId::parse_str(&s) {
            Ok(v) => Some(v),
            Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid parentIssueId"),
        },
        None => None,
    };

    // If parentIssueId exists, ensure it belongs to same org.
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

    let issue = IssueDb {
        id: ObjectId::new(),
        organization_id: org_id,
        title: body.title,
        description: body.description,
        status,
        assignee_id: assignee_oid,
        parent_issue_id: parent_oid,
    };

    if let Err(_) = data.issues.insert_one(&issue).await {
        return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error");
    }

    respond::created_json(IssueOut::from(issue))
}

