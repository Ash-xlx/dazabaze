use actix_web::{get, web, HttpRequest, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::models::OrganizationOut;
use crate::server::AppState;

#[get("/api/organizations/{id}")]
pub async fn organizations_get_by_id(
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

    let org = match data
        .organizations
        .find_one(doc! { "_id": oid, "memberIds": user_id })
        .await
    {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Organization not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    respond::ok_json(OrganizationOut::from(org))
}

