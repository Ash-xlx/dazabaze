//! This module contains the main application logic for the API server, including route definitions and server initialization.

use std::sync::{Arc, Mutex as StdMutex};

use actix_cors::Cors;
use actix_web::dev::{Service, ServiceRequest, ServiceResponse, Transform};
use actix_web::web::Data;
use actix_web::{middleware, App, Error as ActixError, HttpServer};
use actix_web::http::header;
use mongodb::{
    bson::doc,
    options::ClientOptions,
    Client,
    Collection,
};
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::Duration;
use tracing::info;

use crate::api;
use crate::models::{IssueDb, OrganizationDb, UserDb};

#[derive(Clone)]
pub struct AppState {
    pub counter: Arc<StdMutex<i32>>,
    pub users: Collection<UserDb>,
    pub organizations: Collection<OrganizationDb>,
    pub issues: Collection<IssueDb>,
    pub jwt_secret: String,
}

/// Simple middleware used for the health endpoints:
/// it increments a shared request counter on every request.
pub struct RequestCounterMiddleware {
    counter: Arc<StdMutex<i32>>,
}

impl RequestCounterMiddleware {
    pub fn new(counter: Arc<StdMutex<i32>>) -> Self {
        Self { counter }
    }
}

impl<S, B> Transform<S, ServiceRequest> for RequestCounterMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = ActixError> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = ActixError;
    type Transform = RequestCounterMiddlewareService<S>;
    type InitError = ();
    type Future = std::future::Ready<std::result::Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        std::future::ready(Ok(RequestCounterMiddlewareService {
            service: Arc::new(service),
            counter: self.counter.clone(),
        }))
    }
}

pub struct RequestCounterMiddlewareService<S> {
    service: Arc<S>,
    counter: Arc<StdMutex<i32>>,
}

impl<S, B> Service<ServiceRequest> for RequestCounterMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = ActixError> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = ActixError;
    type Future = Pin<Box<dyn Future<Output = std::result::Result<Self::Response, Self::Error>>>>;

    fn poll_ready(&self, _cx: &mut Context<'_>) -> Poll<std::result::Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        if let Ok(mut counter) = self.counter.lock() {
            *counter += 1;
        }

        let fut = self.service.call(req);
        Box::pin(async move {
            let res = fut.await?;
            Ok(res)
        })
    }
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

pub async fn api_server(port: u16) -> std::io::Result<()> {
    // Load env vars from `.env` in common locations (see `env.rs`).
    crate::env::load_env();

    // MongoDB connection string (local or Atlas).
    let mongo_uri = crate::env::require_var("MONGO_URI").map_err(std::io::Error::other)?;
    let mongo_db = env_or("MONGO_DB", "dazabaze");
    // For local dev it’s common to access the frontend via localhost or LAN IP.
    // Set WEB_ORIGIN="*" to allow any origin.
    let web_origin = env_or("WEB_ORIGIN", "http://localhost:3000");
    // JWT secret for signing auth tokens (set a real one in production).
    let jwt_secret = env_or("JWT_SECRET", "dev-secret-change-me");

    let client_options = ClientOptions::parse(&mongo_uri)
        .await
        .map_err(std::io::Error::other)?;
    let client = Client::with_options(client_options).map_err(std::io::Error::other)?;
    let db = client.database(&mongo_db);

    // Ensure basic indexes exist (best effort). The text index is created in `seed`.
    let _ = db
        .collection::<IssueDb>("issues")
        .create_index(mongodb::IndexModel::builder().keys(doc! { "organizationId": 1 }).build())
        .await;
    let _ = db
        .collection::<IssueDb>("issues")
        .create_index(mongodb::IndexModel::builder().keys(doc! { "parentIssueId": 1 }).build())
        .await;

    let counter = Arc::new(StdMutex::new(0));
    let state = Data::new(AppState {
        counter: counter.clone(),
        users: db.collection::<UserDb>("users"),
        organizations: db.collection::<OrganizationDb>("organizations"),
        issues: db.collection::<IssueDb>("issues"),
        jwt_secret,
    });

    info!("Actix API listening on port {}", port);

    HttpServer::new(move || {
        // CORS:
        // - allow WEB_ORIGIN="*" for easiest dev
        // - otherwise allow the configured origin plus common dev LAN origins
        let cors = if web_origin.trim() == "*" {
            Cors::permissive()
        } else {
            // Allow a specific configured origin, plus common dev origins
            // (localhost + local network ranges) so signup/login works when
            // you open Next dev server via LAN IP.
            let configured = web_origin.clone();
            Cors::default()
                .allowed_origin_fn(move |origin, _req_head| {
                    let origin = origin.to_str().unwrap_or_default();
                    if origin == configured {
                        return true;
                    }
                    // common local dev origins
                    if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
                        return true;
                    }
                    // allow private LAN ranges on port 3000
                    origin.starts_with("http://10.") && origin.ends_with(":3000")
                        || origin.starts_with("http://192.168.") && origin.ends_with(":3000")
                        || origin.starts_with("http://172.16.") && origin.ends_with(":3000")
                        || origin.starts_with("http://172.17.") && origin.ends_with(":3000")
                        || origin.starts_with("http://172.18.") && origin.ends_with(":3000")
                        || origin.starts_with("http://172.19.") && origin.ends_with(":3000")
                        || origin.starts_with("http://172.2") && origin.ends_with(":3000")
                        || origin.starts_with("http://172.30.") && origin.ends_with(":3000")
                        || origin.starts_with("http://172.31.") && origin.ends_with(":3000")
                })
                .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
                .allowed_headers(vec![header::AUTHORIZATION, header::CONTENT_TYPE])
                // We use Bearer tokens (Authorization header), not cookies.
        }
        .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(middleware::Compress::default())
            .wrap(RequestCounterMiddleware::new(counter.clone()))
            .app_data(state.clone())
            // services (split into modules)
            // Health/diagnostics
            .service(api::health::ping::ping)
            .service(api::health::diagnostics::diagnostics)
            // Auth (signup/login)
            .service(api::auth::signup::auth_signup)
            .service(api::auth::login::auth_login)
            // Current user
            .service(api::me::get::me_get)
            .service(api::me::delete::me_delete)
            // Organizations (list/get/create)
            .service(api::organizations::list::organizations_list)
            .service(api::organizations::get_by_id::organizations_get_by_id)
            .service(api::organizations::create::organizations_create)
            .service(api::organizations::add_member::organizations_add_member)
            .service(api::organizations::members_list::organizations_members_list)
            .service(api::organizations::delete::organizations_delete)
            // Issues (list/search/get/create/update/delete)
            .service(api::issues::list::issues_list)
            .service(api::issues::search::issues_search)
            .service(api::issues::get_by_id::issues_get_by_id)
            .service(api::issues::create::issues_create)
            .service(api::issues::update::issues_update)
            .service(api::issues::delete::issues_delete)
    })
    .workers(8)
    .keep_alive(Duration::from_secs(60))
    .bind(("0.0.0.0", port))?
    .run()
    .await
}

