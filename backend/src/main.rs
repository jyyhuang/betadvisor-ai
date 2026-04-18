mod prompts;
mod web_search;

use axum::{
    Json, Router,
    http::StatusCode,
    response::IntoResponse,
    routing::{post},
};
use dotenv::dotenv;
use rig::{
    client::{CompletionClient, ProviderClient},
    completion::Prompt,
    providers::openai,
};
use serde::{Deserialize, Serialize};
use serde_json;

use crate::prompts::{PromptTemplate, UserPreferences, ChatMessage};
use crate::web_search::WebSearch;

#[derive(Debug, Serialize, Deserialize)]
struct ChatRequest {
    prompt: String,
    prefs: UserPreferences,
    history: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
struct BetSuggestion {
    player: String,
    market: String,
    pick: String,
    confidence: u8,
    reasoning: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatResponse {
    suggestions: Vec<BetSuggestion>,
    summary: String,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    let app = Router::new()
        .route("/chat", post(chat));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:5000").await.unwrap();

    axum::serve(listener, app)
        .await
        .expect("failed to start server");
}

async fn chat(Json(payload): Json<ChatRequest>) -> impl IntoResponse {
    let client = openai::Client::from_env();

    let built = PromptTemplate::new(payload.prefs)
        .with_system_prompt()
        .with_conversation_history(&payload.history)
        .with_user_prompt(&payload.prompt)
        .build();

    let agent = client
        .agent("gpt-5.2")
        .preamble(&built.system)
        .tool(WebSearch)
        .default_max_turns(5)
        .build();

    let raw: String = match agent.prompt(built.user).await {
        Ok(response) => response.to_string(),
        Err(e) => {
            eprintln!("[chat] Agent prompt failed: {e:#?}");
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Model request failed",
                    "details": e.to_string()
                })),
            )
                .into_response();
        }
    };
    eprintln!("[chat] Raw model response: {raw}");

    match serde_json::from_str::<ChatResponse>(&raw) {
        Ok(data) => (StatusCode::OK, Json(data)).into_response(),
        Err(e) => {
            eprintln!("[chat] JSON parse failed: {e:#?}");
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid JSON from model",
                    "details": e.to_string(),
                    "raw": raw
                })),
            )
                .into_response()
        }
    }
}
