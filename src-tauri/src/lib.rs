use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::Path;
use std::thread;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn start_file_server(port: u16, root_dir: &str) {
    let root = root_dir.to_string();
    thread::spawn(move || {
        let addr = format!("127.0.0.1:{}", port);
        eprintln!("Starting server on {} serving from: {}", addr, root);
        match TcpListener::bind(&addr) {
            Ok(listener) => {
                eprintln!("Server listening on http://{}", addr);
                for stream in listener.incoming() {
                    if let Ok(stream) = stream {
                        let root = root.clone();
                        thread::spawn(move || {
                            handle_request(stream, &root);
                        });
                    }
                }
            }
            Err(e) => eprintln!("Failed to bind: {}", e),
        }
    });
}

fn handle_request(mut stream: TcpStream, root_dir: &str) {
    let mut buffer = [0; 2048];
    if let Ok(n) = stream.read(&mut buffer) {
        let request = String::from_utf8_lossy(&buffer[..n]);
        let path = request
            .lines()
            .next()
            .and_then(|line| {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    Some(parts[1])
                } else {
                    None
                }
            })
            .unwrap_or("/");

        eprintln!("Request path: {}", path);

        let path = path.trim_start_matches('/').trim_end_matches('/');
        let path = if path.is_empty() { "index.html" } else { path };

        let file_path = Path::new(root_dir).join(path);
        eprintln!("Looking for file: {}", file_path.display());

        // Try to serve the requested file
        let mut served = false;
        if file_path.exists() {
            if let Ok(content) = fs::read(&file_path) {
                let mime = match Path::new(path).extension().and_then(|s| s.to_str()) {
                    Some("html") => "text/html; charset=utf-8",
                    Some("css") => "text/css; charset=utf-8",
                    Some("js") => "application/javascript; charset=utf-8",
                    Some("json") => "application/json",
                    Some("png") => "image/png",
                    Some("jpg") | Some("jpeg") => "image/jpeg",
                    Some("svg") => "image/svg+xml",
                    Some("ico") => "image/x-icon",
                    _ => "application/octet-stream",
                };
                
                // Inject attribution into HTML
                let final_content = if mime.contains("text/html") {
                    let mut html = String::from_utf8_lossy(&content).to_string();
                    let attribution = r#"<style>
#clockface-credit-overlay {
  position: fixed; bottom: 0; left: 0; right: 0; top: 0; z-index: 2147483647;
  opacity: 0; pointer-events: none; transition: opacity 0.15s;
  background: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%);
}
#clockface-credit-overlay:hover { opacity: 1; pointer-events: auto; }
#clockface-credit-overlay.show { opacity: 1; }
#clockface-credit {
  position: fixed; bottom: 12px; left: 12px; z-index: 2147483648;
  font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #fff; background: rgba(0,0,0,0.7); padding: 6px 10px;
  border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);
  cursor: default; user-select: none; white-space: nowrap;
  opacity: 0; pointer-events: none; transition: opacity 0.15s;
}
#clockface-credit.show { opacity: 1; }
</style>
<div id="clockface-credit-overlay"></div>
<div id="clockface-credit">Made by github.com/neptotech</div>
<script>
(function() {
  const credit = document.getElementById('clockface-credit');
  const overlay = document.getElementById('clockface-credit-overlay');
  let hideTimer;
  function show() {
    clearTimeout(hideTimer);
    credit.classList.add('show');
    overlay.classList.add('show');
  }
  function hide() {
    hideTimer = setTimeout(() => {
      credit.classList.remove('show');
      overlay.classList.remove('show');
    }, 200);
  }
  document.addEventListener('mouseenter', show, true);
  document.addEventListener('mouseleave', hide, true);
  overlay.addEventListener('mouseenter', show);
  overlay.addEventListener('mouseleave', hide);
})();
</script>"#;
                    html = html.replace("</body>", &format!("{}</body>", attribution));
                    html.into_bytes()
                } else {
                    content
                };
                
                eprintln!("Serving {} ({} bytes) as {}", path, final_content.len(), mime);
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    mime,
                    final_content.len()
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.write_all(&final_content);
                served = true;
            }
        }

        // Fallback to index.html if file not found
        if !served {
            eprintln!("File not found, trying index.html");
            let index_path = Path::new(root_dir).join("index.html");
            if let Ok(content) = fs::read(&index_path) {
                let mut html = String::from_utf8_lossy(&content).to_string();
                let attribution = r#"<style>
#clockface-credit-overlay {
  position: fixed; bottom: 0; left: 0; right: 0; top: 0; z-index: 2147483647;
  opacity: 0; pointer-events: none; transition: opacity 0.15s;
  background: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%);
}
#clockface-credit-overlay:hover { opacity: 1; pointer-events: auto; }
#clockface-credit-overlay.show { opacity: 1; }
#clockface-credit {
  position: fixed; bottom: 12px; left: 12px; z-index: 2147483648;
  font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #fff; background: rgba(0,0,0,0.7); padding: 6px 10px;
  border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);
  cursor: default; user-select: none; white-space: nowrap;
  opacity: 0; pointer-events: none; transition: opacity 0.15s;
}
#clockface-credit.show { opacity: 1; }
</style>
<div id="clockface-credit-overlay"></div>
<div id="clockface-credit">Made by github.com/neptotech</div>
<script>
(function() {
  const credit = document.getElementById('clockface-credit');
  const overlay = document.getElementById('clockface-credit-overlay');
  let hideTimer;
  function show() {
    clearTimeout(hideTimer);
    credit.classList.add('show');
    overlay.classList.add('show');
  }
  function hide() {
    hideTimer = setTimeout(() => {
      credit.classList.remove('show');
      overlay.classList.remove('show');
    }, 200);
  }
  document.addEventListener('mouseenter', show, true);
  document.addEventListener('mouseleave', hide, true);
  overlay.addEventListener('mouseenter', show);
  overlay.addEventListener('mouseleave', hide);
})();
</script>"#;
                html = html.replace("</body>", &format!("{}</body>", attribution));
                let final_content = html.into_bytes();
                eprintln!("Serving index.html ({} bytes)", final_content.len());
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    final_content.len()
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.write_all(&final_content);
            } else {
                eprintln!("index.html not found!");
                let error = b"HTTP/1.1 404 Not Found\r\nContent-Length: 13\r\nConnection: close\r\n\r\nNot Found";
                let _ = stream.write_all(error);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Start file server from app directory
    let app_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    let src_dir = app_dir.join("src");
    
    if src_dir.exists() {
        start_file_server(3030, src_dir.to_string_lossy().as_ref());
        thread::sleep(std::time::Duration::from_millis(50));
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
