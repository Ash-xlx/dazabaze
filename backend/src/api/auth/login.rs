use actix_web::{post, web, HttpRequest, Responder};
use mongodb::bson::doc;

use crate::api::respond;
use crate::auth;
use crate::models::{AuthOut, LoginIn, UserDb, UserOut};
use crate::server::AppState;

#[post("/api/auth/login")]
pub async fn auth_login(
    data: web::Data<AppState>,
    _req: HttpRequest,
    body: web::Json<LoginIn>,
) -> impl Responder {
    let body = body.into_inner();
    if body.email.trim().is_empty() || body.password.trim().is_empty() {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Email and password are required");
    }

    let user = match data.users.find_one(doc! { "email": body.email }).await {
        Ok(Some(u)) => u,
        Ok(None) => return respond::error(actix_web::http::StatusCode::UNAUTHORIZED, "Invalid credentials"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    let ok = bcrypt::verify(&body.password, &user.password_hash).unwrap_or(false);
    if !ok {
        return respond::error(actix_web::http::StatusCode::UNAUTHORIZED, "Invalid credentials");
    }

    let token = match auth::issue_token(user.id, &data.jwt_secret) {
        Ok(t) => t,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Token generation failed"),
    };

    let out = AuthOut {
        token,
        user: UserOut::from(UserDb { password_hash: String::new(), ..user }),
    };

    respond::ok_json(out)
}

