use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use serde_json::json;
use std::sync::MutexGuard as StdMutexGuard;
use std::time::Instant;

use crate::server::AppState;

/// Healthcheck / ping endpoint (also shows request counter).
#[get("/")]
pub async fn ping(data: web::Data<AppState>, _req: HttpRequest) -> impl Responder {
    let start_time: Instant = Instant::now();
    let latency: u128 = start_time.elapsed().as_millis();

    let request_count: i32 = {
        let counter_guard: StdMutexGuard<'_, i32> = data.counter.lock().unwrap();
        *counter_guard
    };

    HttpResponse::Ok().json(json!({
        "status": "healthy",
        "message": "api is healthy",
        "version": env!("CARGO_PKG_VERSION"),
        "latency": latency,
        "request_count": request_count
    }))
}

