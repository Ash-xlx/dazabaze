use actix_web::{get, web, Responder};
use futures_util::TryStreamExt;
use mongodb::bson::doc;

use crate::api::respond;
use crate::models::{EmployeeOut, SearchQuery};
use crate::server::AppState;

#[get("/api/employees/search")]
pub async fn employees_search(
    data: web::Data<AppState>,
    query: web::Query<SearchQuery>,
) -> impl Responder {
    let q = query.q.clone().unwrap_or_default();
    let q = q.trim().to_string();
    if q.is_empty() {
        return respond::ok_json(Vec::<EmployeeOut>::new());
    }

    let mut cursor = match data
        .employees
        .find(doc! { "$text": { "$search": q } })
        .sort(doc! { "score": { "$meta": "textScore" } })
        .projection(doc! { "score": { "$meta": "textScore" } })
        .limit(50)
        .await
    {
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

