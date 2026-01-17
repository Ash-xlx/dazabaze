use actix_web::{get, web, Responder};
use std::sync::MutexGuard as StdMutexGuard;

use crate::server::AppState;

#[get("/diagnostics")]
pub async fn diagnostics(data: web::Data<AppState>) -> impl Responder {
    let counter: i32 = {
        let counter_guard: StdMutexGuard<'_, i32> = data.counter.lock().unwrap();
        *counter_guard
    };
    format!("Request number: {counter}")
}

