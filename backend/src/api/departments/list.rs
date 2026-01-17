use actix_web::{get, web, Responder};
use futures_util::TryStreamExt;
use mongodb::bson::doc;

use crate::api::respond;
use crate::models::DepartmentOut;
use crate::server::AppState;

#[get("/api/departments")]
pub async fn departments_list(data: web::Data<AppState>) -> impl Responder {
    let mut cursor = match data.departments.find(doc! {}).sort(doc! { "code": 1 }).await {
        Ok(c) => c,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    let mut out: Vec<DepartmentOut> = Vec::new();
    while let Some(dept) = match cursor.try_next().await {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    } {
        out.push(DepartmentOut::from(dept));
    }

    respond::ok_json(out)
}

