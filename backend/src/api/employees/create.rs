use actix_web::{post, web, Responder};
use mongodb::bson::{doc, oid::ObjectId};

use crate::api::respond;
use crate::models::{EmployeeDb, EmployeeIn, EmployeeOut};
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

#[post("/api/employees")]
pub async fn employees_create(
    data: web::Data<AppState>,
    body: web::Json<EmployeeIn>,
) -> impl Responder {
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

    let emp = EmployeeDb {
        id: ObjectId::new(),
        department_id: department_oid,
        name: body.name,
        role: body.role,
        bio: body.bio,
        email: body.email,
    };

    if let Err(_) = data.employees.insert_one(&emp).await {
        return respond::error(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Database error");
    }

    respond::created_json(EmployeeOut::from(emp))
}

