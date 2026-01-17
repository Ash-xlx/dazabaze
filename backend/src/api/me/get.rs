use actix_web::{get, web, HttpRequest, Responder};
use mongodb::bson::doc;

use crate::api::respond;
use crate::auth;
use crate::models::UserOut;
use crate::server::AppState;

/// Profile overview for the currently logged-in user.
#[get("/api/me")]
pub async fn me_get(data: web::Data<AppState>, req: HttpRequest) -> impl Responder {
    let user_id = match auth::require_user_id(&req, &data.jwt_secret) {
        Ok(u) => u,
        Err(e) => return e,
    };

    let user = match data.users.find_one(doc! { "_id": user_id }).await {
        Ok(Some(u)) => u,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "User not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    respond::ok_json(UserOut::from(user))
}

