use actix_web::{get, web, HttpRequest, Responder};
use futures_util::TryStreamExt;
use mongodb::bson::{doc, oid::ObjectId};
use std::collections::HashSet;

use crate::api::respond;
use crate::auth;
use crate::models::UserOut;
use crate::server::AppState;

/// List organization members (requires membership).
#[get("/api/organizations/{id}/members")]
pub async fn organizations_members_list(
    data: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let org_id = match ObjectId::parse_str(&path.into_inner()) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    // membership check + load org
    let org = match data
        .organizations
        .find_one(doc! { "_id": org_id, "memberIds": user_id })
        .await
    {
        Ok(Some(v)) => v,
        Ok(None) => {
            return respond::error(
                actix_web::http::StatusCode::FORBIDDEN,
                "Not a member of this organization",
            )
        }
        Err(_) => {
            return respond::error(
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Database error",
            )
        }
    };

    let mut ids: HashSet<ObjectId> = org.member_ids.into_iter().collect();
    ids.insert(org.owner_id);
    let ids: Vec<ObjectId> = ids.into_iter().collect();

    let mut cursor = match data.users.find(doc! { "_id": { "$in": ids } }).await {
        Ok(c) => c,
        Err(_) => {
            return respond::error(
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Database error",
            )
        }
    };

    let mut out: Vec<UserOut> = Vec::new();
    while let Some(user) = match cursor.try_next().await {
        Ok(v) => v,
        Err(_) => {
            return respond::error(
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Database error",
            )
        }
    } {
        out.push(user.into());
    }

    respond::ok_json(out)
}

