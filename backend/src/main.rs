mod prompts;

use std::collections::HashMap;

use axum::{Json, Router, http::StatusCode, response::IntoResponse, routing::get};
use rig::client::{CompletionClient, ProviderClient};
use rig::completion::Prompt;
use rig::providers::openai;
use serde::{Deserialize, Serialize};

use crate::prompts::{BuiltPrompt, PromptTemplate};

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(hello));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    axum::serve(listener, app)
        .await
        .expect("failed to start server");
}

#[derive(Deserialize)]
struct ChatRequest {
    prompt: String,
    prefs: HashMap<String, String>,
}

async fn hello() -> &'static str {
    "Hello World"
}

async fn chat(Json(payload): Json<ChatRequest>) -> impl IntoResponse {
    let client = openai::Client::from_env();
    let built = PromptTemplate::new(payload.prefs)
        .with_system_prompt()
        .with_user_prompt(payload.prompt, ctx)
        .build();

    let agent = client.agent("gpt-5.2").preamble(built.system).build();
    let response = agent.prompt(built.user).await.unwrap();
    (StatusCode::OK, Json(response))
}
