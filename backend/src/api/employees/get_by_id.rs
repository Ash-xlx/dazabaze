use actix_web::{get, web, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::models::EmployeeOut;
use crate::server::AppState;

#[get("/api/employees/{id}")]
pub async fn employees_get_by_id(
    data: web::Data<AppState>,
    id: web::Path<String>,
) -> impl Responder {
    let oid = match ObjectId::parse_str(&id.into_inner()) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    let doc = match data.employees.find_one(doc! { "_id": oid }).await {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Employee not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    respond::ok_json(EmployeeOut::from(doc))
}

