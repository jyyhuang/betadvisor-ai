use std::fmt;

#[derive(Debug, Clone, Copy)]
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

#[derive(Debug, Clone, Copy)]
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

#[derive(Debug, Clone, Copy)]
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

struct RagContext {
    documents: Vec<String>,
}

struct UserPreferences {
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
        self.system = format!(
            "You are a certified personal betting advisor for prediction markets. Your client has the following profile: Age: {} | Experience Level: {} | Monthly Budget: {} | Risk tolerance: {} | Primary Goal: {} | Favorite Markets: {} Always respond with: (1) a brief assessment, (2) 3 actionable recommendations, (3) one risk to watch. Be concise, specific, and avoid jargon.",
            UserPreferences::format_option(&self.prefs.age),
            UserPreferences::format_option(&self.prefs.experience_level),
            UserPreferences::format_option(&self.prefs.monthly_budget),
            UserPreferences::format_option(&self.prefs.risk_tolerance),
            UserPreferences::format_option(&self.prefs.primary_goal),
            UserPreferences::format_option(&self.prefs.favorite_markets),
        );
        self
    }

    pub fn with_user_prompt(mut self, request: &str, ctx: RagContext) -> Self {
        let context_str = ctx.documents.join("\n");
        self.user = format!(
            "\nUser request: {}\n\nRelevant context from knowledge base:\n{}",
            request, context_str
        );
        self
    }
}
