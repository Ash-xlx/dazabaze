use actix_web::http::StatusCode;
use actix_web::HttpResponse;
use serde::Serialize;

#[derive(Serialize)]
struct MessageBody<'a> {
    message: &'a str,
}

pub fn ok_json<T: Serialize>(value: T) -> HttpResponse {
    HttpResponse::Ok().json(value)
}

pub fn created_json<T: Serialize>(value: T) -> HttpResponse {
    HttpResponse::Created().json(value)
}

pub fn error(status: StatusCode, message: &str) -> HttpResponse {
    HttpResponse::build(status).json(MessageBody { message })
}

