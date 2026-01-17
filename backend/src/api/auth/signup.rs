use actix_web::{post, web, HttpRequest, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::auth;
use crate::models::{AuthOut, SignupIn, UserDb, UserOut};
use crate::server::AppState;

fn validate_signup(body: &SignupIn) -> Result<(), &'static str> {
    if body.email.trim().is_empty() || body.name.trim().is_empty() || body.password.trim().is_empty()
    {
        return Err("All fields are required");
    }
    if !body.email.contains('@') {
        return Err("Invalid email");
    }
    if body.password.len() < 8 {
        return Err("Password must be at least 8 characters");
    }
    Ok(())
}

#[post("/api/auth/signup")]
pub async fn auth_signup(
    data: web::Data<AppState>,
    _req: HttpRequest,
    body: web::Json<SignupIn>,
) -> impl Responder {
    let body = body.into_inner();
    if let Err(msg) = validate_signup(&body) {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, msg);
    }

    let existing = match data.users.find_one(doc! { "email": body.email.clone() }).await {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };
    if existing.is_some() {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Email already exists");
    }

    let password_hash = match bcrypt::hash(&body.password, bcrypt::DEFAULT_COST) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Password hashing failed"),
    };

    let user = UserDb {
        id: ObjectId::new(),
        email: body.email,
        name: body.name,
        password_hash,
    };

    if let Err(_) = data.users.insert_one(&user).await {
        return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error");
    }

    let token = match auth::issue_token(user.id, &data.jwt_secret) {
        Ok(t) => t,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Token generation failed"),
    };

    let out = AuthOut {
        token,
        user: UserOut::from(user),
    };

    respond::created_json(out)
}

