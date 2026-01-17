use actix_web::{get, web, Responder};
use futures_util::TryStreamExt;
use mongodb::bson::doc;

use crate::api::respond;
use crate::models::EmployeeOut;
use crate::server::AppState;

#[get("/api/employees")]
pub async fn employees_list(data: web::Data<AppState>) -> impl Responder {
    let mut cursor = match data.employees.find(doc! {}).await {
        Ok(c) => c,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    let mut out: Vec<EmployeeOut> = Vec::new();
    while let Some(emp) = match cursor.try_next().await {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    } {
        out.push(EmployeeOut::from(emp));
    }

    respond::ok_json(out)
}

