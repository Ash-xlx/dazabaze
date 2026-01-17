use actix_web::{get, web, HttpRequest, Responder};
use futures_util::TryStreamExt;
use mongodb::bson::doc;

use crate::api::respond;
use crate::auth;
use crate::models::OrganizationOut;
use crate::server::AppState;

#[get("/api/organizations")]
pub async fn organizations_list(
    data: web::Data<AppState>,
    req: HttpRequest,
) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let filter = doc! { "memberIds": user_id };
    let mut cursor = match data.organizations.find(filter).sort(doc! { "name": 1 }).await {
        Ok(c) => c,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    let mut out: Vec<OrganizationOut> = Vec::new();
    while let Some(org) = match cursor.try_next().await {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    } {
        out.push(OrganizationOut::from(org));
    }

    respond::ok_json(out)
}

