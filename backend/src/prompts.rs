use std::fmt;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
enum ExperienceLevel {
    Beginner,
    Intermediate,
    Advanced,
}

impl fmt::Display for ExperienceLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ExperienceLevel::Beginner => write!(f, "Beginner"),
            ExperienceLevel::Intermediate => write!(f, "Intermediate"),
            ExperienceLevel::Advanced => write!(f, "Advanced"),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
enum RiskTolerance {
    Low,
    Medium,
    High,
}

impl fmt::Display for RiskTolerance {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RiskTolerance::Low => write!(f, "Low"),
            RiskTolerance::Medium => write!(f, "Medium"),
            RiskTolerance::High => write!(f, "High"),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
enum PrimaryGoal {
    Profit,
    Entertainment,
    Analysis,
}

impl fmt::Display for PrimaryGoal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PrimaryGoal::Profit => write!(f, "Profit"),
            PrimaryGoal::Entertainment => write!(f, "Entertainment"),
            PrimaryGoal::Analysis => write!(f, "Analysis"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserPreferences {
    age: Option<u8>,
    experience_level: Option<ExperienceLevel>,
    monthly_budget: Option<u32>,
    risk_tolerance: Option<RiskTolerance>,
    primary_goal: Option<PrimaryGoal>,
    favorite_markets: Option<String>,
}

impl UserPreferences {
    fn format_option<T: fmt::Display>(opt: &Option<T>) -> String {
        match opt {
            Some(val) => val.to_string(),
            None => "N/A".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

pub struct BuiltPrompt {
    pub system: String,
    pub user: String,
}

pub struct PromptTemplate {
    system: String,
    user: String,
    prefs: UserPreferences,
}

impl PromptTemplate {
    pub fn new(prefs: UserPreferences) -> Self {
        Self {
            system: String::new(),
            user: String::new(),
            prefs,
        }
    }

    pub fn build(self) -> BuiltPrompt {
        BuiltPrompt {
            system: self.system,
            user: self.user,
        }
    }

    pub fn with_system_prompt(mut self) -> Self {
        let structured_insructions = r#"
            Only respond with valid JSON in this exact format:

            {
                "suggestions": [
                    {
                        "player": "string",
                        "market": "string",
                        "pick": "string",
                        "confidence": "integer",
                        "reasoning": string
                    }
                ],
                "summary": string
            }
            "#;
        self.system = format!(
            "You are a certified personal betting advisor for prediction markets like Kalshi and Polymarket. Your client has the following profile: Age: {} | Experience Level: {} | Monthly Budget: {} | Risk tolerance: {} | Primary Goal: {} | Favorite Markets: {}\n. Always call the web search tool before outputting a response.\n\n{}",
            UserPreferences::format_option(&self.prefs.age),
            UserPreferences::format_option(&self.prefs.experience_level),
            UserPreferences::format_option(&self.prefs.monthly_budget),
            UserPreferences::format_option(&self.prefs.risk_tolerance),
            UserPreferences::format_option(&self.prefs.primary_goal),
            UserPreferences::format_option(&self.prefs.favorite_markets),
            structured_insructions
        );
        self
    }

    pub fn with_user_prompt(mut self, request: &str) -> Self {
        self.user = format!("\nUser request: {}\n", request);
        self
    }

    pub fn with_conversation_history(mut self, history: &[ChatMessage]) -> Self {
        if history.is_empty() {
            return self;
        }

        let mut context = String::from("\n\nPrevious conversation:\n");
        for msg in history {
            let label = if msg.role == "user" {
                "User"
            } else {
                "Assistant"
            };
            context.push_str(&format!("{}: {}\n", label, msg.content));
        }
        context.push_str("\n");

        self.user = format!("{}{}", context, self.user);
        self
    }
}
