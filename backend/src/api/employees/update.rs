use actix_web::{put, web, Responder};
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::options::ReturnDocument;

use crate::api::respond;
use crate::models::{EmployeeIn, EmployeeOut};
use crate::server::AppState;

fn validate_employee(body: &EmployeeIn) -> Result<(), &'static str> {
    if body.department_id.trim().is_empty()
        || body.name.trim().is_empty()
        || body.role.trim().is_empty()
        || body.bio.trim().is_empty()
        || body.email.trim().is_empty()
    {
        return Err("All fields are required");
    }
    if !body.email.contains('@') {
        return Err("Invalid email");
    }
    Ok(())
}

#[put("/api/employees/{id}")]
pub async fn employees_update(
    data: web::Data<AppState>,
    path: web::Path<String>,
    body: web::Json<EmployeeIn>,
) -> impl Responder {
    let id = path.into_inner();
    let oid = match ObjectId::parse_str(&id) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid id"),
    };

    let body = body.into_inner();
    if let Err(msg) = validate_employee(&body) {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, msg);
    }

    let department_oid = match ObjectId::parse_str(&body.department_id) {
        Ok(v) => v,
        Err(_) => return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "Invalid departmentId"),
    };

    let dept_exists = match data
        .departments
        .find_one(doc! { "_id": department_oid })
        .await
    {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };
    if !dept_exists {
        return respond::error(actix_web::http::StatusCode::BAD_REQUEST, "departmentId does not exist");
    }

    let update = doc! {
        "$set": {
            "departmentId": department_oid,
            "name": body.name,
            "role": body.role,
            "bio": body.bio,
            "email": body.email
        }
    };

    let updated = match data
        .employees
        .find_one_and_update(doc! { "_id": oid }, update)
        .return_document(ReturnDocument::After)
        .await
    {
        Ok(Some(v)) => v,
        Ok(None) => return respond::error(actix_web::http::StatusCode::NOT_FOUND, "Employee not found"),
        Err(_) => return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
    };

    respond::ok_json(EmployeeOut::from(updated))
}

