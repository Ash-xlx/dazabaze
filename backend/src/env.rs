/// Loads environment variables from common `.env` locations.
///
/// This makes it work whether you run:
/// - `cargo run` from `backend/`
/// - `cargo run` from the repo root
pub fn load_env() {
    // Try dotenvy first (best effort).
    let _ = dotenvy::dotenv();
    let _ = dotenvy::from_filename(".env");
    let _ = dotenvy::from_filename("backend/.env");
    let _ = dotenvy::from_filename("../.env");

    // Fallback parser: handles minor formatting/encoding issues that can make
    // dotenv parsers reject the file (common on Windows).
    load_simple_env_file(".env");
    load_simple_env_file("backend/.env");
    load_simple_env_file("../.env");
}

/// Gets an env var, also handling a common Windows UTF-8 BOM issue
/// where the first key becomes `\u{feff}KEY`.
pub fn get_var(key: &str) -> Option<String> {
    std::env::var(key)
        .ok()
        .or_else(|| std::env::var(format!("\u{feff}{key}")).ok())
}

fn load_simple_env_file(path: &str) {
    let Ok(contents) = std::fs::read_to_string(path) else {
        return;
    };

    for mut line in contents.lines() {
        line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let Some((raw_key, raw_value)) = line.split_once('=') else {
            continue;
        };

        let key = raw_key.trim().trim_start_matches('\u{feff}');
        if key.is_empty() {
            continue;
        }

        let mut value = raw_value.trim().trim_end_matches('\r').to_string();
        // Strip optional surrounding quotes
        if value.len() >= 2 {
            let bytes = value.as_bytes();
            if bytes[0] == b'"' && bytes[bytes.len() - 1] == b'"' {
                value = value[1..bytes.len() - 1].to_string();
            }
        }

        // Do not override values that are already set by the real environment.
        if std::env::var(key).is_err() && std::env::var(format!("\u{feff}{key}")).is_err() {
            // SAFETY: called during process startup before we spawn worker threads.
            unsafe {
                std::env::set_var(key, value);
            }
        }
    }
}

fn env_file_exists(path: &str) -> bool {
    std::fs::metadata(path).is_ok()
}

fn env_debug_hint() -> String {
    let cwd = std::env::current_dir()
        .map(|p| p.display().to_string())
        .unwrap_or_else(|_| "<unknown>".to_string());

    format!(
        "cwd={cwd}; .env exists? {} ; backend/.env exists? {} ; ../.env exists? {}",
        env_file_exists(".env"),
        env_file_exists("backend/.env"),
        env_file_exists("../.env")
    )
}

pub fn require_var(key: &str) -> anyhow::Result<String> {
    get_var(key).ok_or_else(|| anyhow::anyhow!("Missing required env var: {key}. {}", env_debug_hint()))
}

