use actix_web::{get, web, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::models::DepartmentOut;
use crate::server::AppState;

#[get("/api/departments/{id}")]
pub async fn departments_get_by_id(
    data: web::Data<AppState>,
    id: web::Path<String>,
) -> impl Responder {
    let oid = match ObjectId::parse_str(&id.into_inner()) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    let doc = match data.departments.find_one(doc! { "_id": oid }).await {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Department not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    respond::ok_json(DepartmentOut::from(doc))
}

