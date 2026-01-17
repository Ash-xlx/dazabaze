use actix_web::http::header;
use actix_web::{HttpRequest, HttpResponse};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};


/// - Backend issues a JWT on login/signup
/// - Frontend stores the token and sends `Authorization: Bearer <token>`
/// - API endpoints verify the token and extract the user id (`sub`)
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    // user id
    sub: String,
    exp: usize,
}

/// Creates a signed JWT that expires in ~24h.
pub fn issue_token(user_id: ObjectId, jwt_secret: &str) -> anyhow::Result<String> {
    let exp = (Utc::now() + Duration::hours(24)).timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_hex(),
        exp,
    };
    Ok(encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )?)
}

/// Extracts user id from `Authorization
/// Returns `HttpResponse::Unauthorized()` on failure so route handlers can
/// `return e;` while still returning `impl Responder`.
pub fn require_user_id(req: &HttpRequest, jwt_secret: &str) -> Result<ObjectId, HttpResponse> {
    let header_value = req
        .headers()
        .get(header::AUTHORIZATION)
        .ok_or_else(|| {
            HttpResponse::Unauthorized().json(serde_json::json!({ "message": "Missing Authorization header" }))
        })?
        .to_str()
        .map_err(|_| {
            HttpResponse::Unauthorized().json(serde_json::json!({ "message": "Invalid Authorization header" }))
        })?;

    let token = header_value
        .strip_prefix("Bearer ")
        .ok_or_else(|| {
            HttpResponse::Unauthorized().json(serde_json::json!({ "message": "Expected Bearer token" }))
        })?;

    let decoded = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| HttpResponse::Unauthorized().json(serde_json::json!({ "message": "Invalid token" })))?;

    ObjectId::parse_str(&decoded.claims.sub)
        .map_err(|_| HttpResponse::Unauthorized().json(serde_json::json!({ "message": "Invalid token subject" })))
}

