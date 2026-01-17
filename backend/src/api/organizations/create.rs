use actix_web::{post, web, HttpRequest, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::models::{OrganizationCreateIn, OrganizationDb, OrganizationOut};
use crate::server::AppState;

fn validate_org(body: &OrganizationCreateIn) -> Result<(), &'static str> {
    if body.name.trim().is_empty() || body.key.trim().is_empty() {
        return Err("name and key are required");
    }
    let key = body.key.trim();
    if key.len() < 2 || key.len() > 8 {
        return Err("key must be 2-8 characters");
    }
    Ok(())
}

#[post("/api/organizations")]
pub async fn organizations_create(
    data: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<OrganizationCreateIn>,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let body = body.into_inner();
    if let Err(msg) = validate_org(&body) {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, msg);
    }

    // enforce unique key
    let existing = match data
        .organizations
        .find_one(doc! { "key": body.key.to_uppercase() })
        .await
    {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };
    if existing.is_some() {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Organization key already exists");
    }

    let org = OrganizationDb {
        id: ObjectId::new(),
        name: body.name,
        key: body.key.to_uppercase(),
        owner_id: user_id,
        member_ids: vec![user_id],
    };

    if let Err(_) = data.organizations.insert_one(&org).await {
        return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error");
    }

    respond::created_json(OrganizationOut::from(org))
}

