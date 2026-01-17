use actix_web::{delete, web, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::server::AppState;

#[delete("/api/employees/{id}")]
pub async fn employees_delete(
    data: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();
    let oid = match ObjectId::parse_str(&id) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    let deleted = match data
        .employees
        .find_one_and_delete(doc! { "_id": oid })
        .await
    {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    if deleted.is_none() {
        return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Employee not found");
    }

    respond::ok_json(serde_json::json!({ "ok": true }))
}

