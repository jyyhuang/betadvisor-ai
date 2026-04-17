use reqwest::Client;
use rig::{completion::ToolDefinition, tool::Tool};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct SearchArgs {
    query: String,
    #[serde(default)]
    max_results: Option<u32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WebSearchResult {
    pub results: Vec<SearchItem>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SearchItem {
    pub title: String,
    pub url: String,
    pub snippet: String,
}

#[derive(Debug, thiserror::Error)]
pub enum SearchError {
    #[error("HTTP request failed: {0}")]
    Request(#[from] reqwest::Error),
    #[error("API error: {0}")]
    Api(String),
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
pub struct WebSearch;

impl Tool for WebSearch {
    const NAME: &'static str = "web_search";
    type Error = SearchError;
    type Args = SearchArgs;
    type Output = WebSearchResult;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        serde_json::from_value(serde_json::json!({
            "name": "web_search",
            "description": "Search the web for current information on sports, events, or topics.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query string"
                    },
                    "max_results": {
                        "type": "number",
                        "description": "Maximum number of results to return (default: 5)"
                    }
                },
                "required": ["query"]
            }
        }))
        .expect("ToolDefinition")
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let max_results = args.max_results.unwrap_or(5);
        let query = &args.query;

        let api_key =
            std::env::var("EXA_API_KEY").expect("EXA_API_KEY environment variable not set");

        let client = Client::new();
        let response = client
            .post("https://api.exa.ai/search")
            .header("x-api-key", api_key)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "query": query,
                "num_results": max_results,
                "type": "auto"
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(SearchError::Api(format!("{}: {}", status, text)));
        }

        let data: serde_json::Value = response.json().await?;
        let results = data["results"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .map(|item| SearchItem {
                        title: item["title"].as_str().unwrap_or("").to_string(),
                        url: item["url"].as_str().unwrap_or("").to_string(),
                        snippet: item["text"].as_str().unwrap_or("").to_string(),
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(WebSearchResult { results })
    }
}
