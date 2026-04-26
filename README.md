# BetAdvisor AI

An AI-powered betting and prediction market advisor that provides personalized bet suggestions based on user preferences and real-time web search.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                  │
│  ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │ PreferencesPanel│    │       ResponseDisplay       │  │
│  │  (User Profile) │    │   (Bet Suggestions/Chat)    │  │
│  └────────┬────────┘    └──────────────┬──────────────┘  │
└───────────┼────────────────────────────┼─────────────────┘
            │ POST /chat                 │ JSON
            ▼                            ▼
┌────────────────────────────────────────────────────────┐
│                  Backend (Axum/Rust)                   │
│                                                        │
│  ┌──────────────┐  ┌─────────────────────────────┐     │
│  │PromptTemplate│→ │        LLM Agent            │     │
│  │(User Prefs)  │  │  (gpt-5.2 + WebSearch       │     │
│  └──────────────┘  └──────────────┬──────────────┘     │
└───────────────────────────────────┼────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │  OpenAI API  │       │   Exa API    │       │   User Input │
    │ (LLM Calls)  │       │(Web Search)  │       │ (Preferences)│
    └──────────────┘       └──────────────┘       └──────────────┘
```

**Data Flow:**
1. User fills preferences panel (age, experience, budget, risk tolerance, goals)
2. User submits a question about betting markets
3. Frontend sends preferences + question + history to backend `/chat` endpoint
4. Backend builds a prompt incorporating user profile and conversation history
5. LLM agent (gpt-5.2) uses `WebSearch` tool to fetch current market data via Exa API
6. Agent returns structured JSON with bet suggestions and summary
7. Frontend displays formatted suggestions and reasoning

---

## Setup

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) (v1.x)
- [Node.js](https://nodejs.org/) (v18+)
- OpenAI API key
- Exa API key

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/betadvisor-ai.git
cd betadvisor-ai
```

**Backend environment:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys:
# OPENAI_API_KEY=sk-...
# EXA_API_KEY=exa_...
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
cargo build
```

**Frontend:**
```bash
cd frontend
bun install
```

### 3. Run Locally

In one terminal, start the backend:
```bash
cd backend
cargo run
```

In another terminal, start the frontend:
```bash
cd frontend
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API

### POST `/chat`

**Request:**
```json
{
  "prompt": "What are the best NBA bets this week?",
  "prefs": {
    "age": 28,
    "experience_level": "Intermediate",
    "monthly_budget": 500,
    "risk_tolerance": "Medium",
    "primary_goal": "Profit",
    "favorite_markets": "NBA, NFL"
  },
  "history": []
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "player": "Luka Doncic",
      "market": "NBA Props",
      "pick": "Over 32.5 Points",
      "confidence": 78,
      "reasoning": "He's averaging 35 in his last 5 home games against teams with bottom-10 defensive ratings."
    }
  ],
  "summary": "Focus on high-confidence NBA props with favorable matchup data."
}
```

---

## Tech Stack

| Layer    | Technology           |
|---------|----------------------|
| Frontend | Next.js, React 19, TypeScript, Tailwind CSS |
| Backend  | Rust, Axum, Tokio, rig-core              |
| LLM      | OpenAI GPT-5.2                            |
| Search   | Exa API                                   |
