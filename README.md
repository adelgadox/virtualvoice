# VirtualVoice — AI-Powered Virtual Influencer Response System

> Backend + approval panel to manage automated responses for virtual influencers on Instagram and Facebook, with AI-generated responses and human approval before publishing.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Core Modules](#core-modules)
  - [Personality Engine](#personality-engine)
  - [LLM Provider Pattern](#llm-provider-pattern)
  - [Knowledge Base & RAG](#knowledge-base--rag)
  - [Meta Integration](#meta-integration)
  - [Approval Panel](#approval-panel)
- [Database](#database)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Workflow](#workflow)

---

## Overview

**VirtualVoice** is a system that manages virtual influencers on social media (Instagram, Facebook, Threads) with AI-generated responses that reflect each influencer's unique personality.

The flow is always:

```
Comment received → AI generates response → Team approves → Published
```

Nothing is ever published without human approval. This guarantees quality, brand consistency, and full control over what each virtual influencer says.

### Key features

- **Personality Engine** — each influencer has their own identity, tone, and knowledge base
- **LLM-agnostic** — switch between Gemini, Claude, GPT-4o or others without touching business logic
- **Human-in-the-loop** — every response goes through approval before publishing
- **RAG over personality** — each influencer's knowledge base is dynamically queried with pgvector
- **Feedback loop** — approved/edited responses improve the model over time
- **Multi-influencer** — supports multiple virtual influencers from the same system

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SOCIAL NETWORKS                        │
│              Instagram · Facebook · Threads                 │
└────────────────────────┬────────────────────────────────────┘
                         │ Webhook (new comment)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI / Railway)                 │
│                                                             │
│  ┌──────────────┐    ┌─────────────────────────────────┐   │
│  │ Meta Webhook │───▶│        Personality Engine        │   │
│  │   Handler    │    │                                  │   │
│  └──────────────┘    │  1. Base system prompt           │   │
│                      │  2. RAG → knowledge base         │   │
│  ┌──────────────┐    │  3. Response history             │   │
│  │  Meta Graph  │    │  4. Situational context          │   │
│  │     API      │    └────────────────┬────────────────┘   │
│  │  (publish)   │                     │                     │
│  └──────┬───────┘                     ▼                     │
│         │              ┌──────────────────────────┐         │
│         │              │     LLM Provider Layer    │         │
│         │              │  Gemini · Claude · GPT-4o │         │
│         │              └────────────┬─────────────┘         │
│         │                           │                        │
│         │              ┌────────────▼─────────────┐         │
│         │              │   Generated response      │         │
│         │              │   → saved to DB           │         │
│         │              │   → status: PENDING       │         │
│         │              └──────────────────────────┘         │
│         │                                                    │
│  ┌──────┴───────────────────────────────────────────────┐   │
│  │                   PostgreSQL + pgvector               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                FRONTEND — Approval Panel                     │
│                   (Next.js / Vercel)                         │
│                                                             │
│   Original comment + Suggested response                     │
│   [✅ Approve]  [✏️ Edit]  [🔄 Regenerate]  [❌ Ignore]    │
└─────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

Monorepo with separate frontend and backend for independent deployment (Vercel + Railway), same pattern as Bioflow.

```
virtualvoice/
│
├── backend/                        # FastAPI — deployed on Railway
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── webhooks.py
│   │   │   ├── responses.py
│   │   │   ├── influencers.py
│   │   │   └── knowledge.py
│   │   ├── core/
│   │   │   ├── personality/        # Personality Engine + RAG
│   │   │   ├── llm/                # LLM provider pattern
│   │   │   └── meta/               # Meta Graph API integration
│   │   ├── models/                 # SQLAlchemy models
│   │   └── schemas/                # Pydantic schemas
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                       # Next.js — deployed on Vercel
│   └── src/
│       ├── app/
│       │   ├── (auth)/             # Login + Register (gradient layout)
│       │   └── dashboard/          # Protected dashboard
│       └── components/
│           ├── dashboard/          # Sidebar, layout components
│           └── ui/                 # Shared UI components
│
├── docker-compose.yml
└── README.md
```

---

## Tech Stack

### Backend
| Technology | Use |
|---|---|
| **Python 3.12+** | Main language |
| **FastAPI** | REST API + webhooks |
| **PostgreSQL** | Main database |
| **pgvector** | Embeddings / RAG |
| **SQLAlchemy + Alembic** | ORM and migrations |
| **Pydantic v2** | Data validation and schemas |

### Frontend
| Technology | Use |
|---|---|
| **Next.js 15+** | React framework (App Router) |
| **TypeScript** | Static typing |
| **Tailwind CSS v4** | Styling |
| **NextAuth v5** | Authentication (credentials + Google SSO) |

### External Integrations
| Service | Use |
|---|---|
| **Meta Graph API** | Read comments and publish responses |
| **Google Gemini API** | LLM option (native SDK) |
| **Anthropic API** | LLM option (native SDK) |
| **OpenAI / DeepSeek / Qwen / Perplexity / Groq / Mistral / Ollama** | LLM options via generic OpenAI-compatible adapter |

### Deployment
| Service | What it deploys |
|---|---|
| **Railway** | FastAPI backend + PostgreSQL |
| **Vercel** | Next.js frontend |

---

## Core Modules

### Personality Engine

The heart of the system. Builds the full context so the LLM responds as the specific virtual influencer.

Each influencer's personality is structured in three layers:

**Layer 1 — Core system prompt** _(rarely changes)_
Defines fundamental identity: name, age, city, tone, language, characteristic phrases, forbidden topics, writing style, emoji usage, etc.

**Layer 2 — Vectorized knowledge base** _(updated frequently)_
Stored in PostgreSQL + pgvector. Contains:
- Detailed biography and backstory
- Opinions on frequent topics in their niche
- Relationships with brands, other creators, frequent followers
- Context from recent posts
- Past approved responses (examples of their real voice)
- "Things they would/would never say" list

**Layer 3 — Situational context** _(dynamic, per moment)_
- What they posted today and the specific post context that received the comment
- Current mood (travel, collaboration, rest, launch)
- Relevant trends for their niche at that moment

Each LLM call combines all three layers:
```
final_prompt = system_prompt_core
             + relevant_knowledge_base_fragments (RAG)
             + current_post_context
             + user_comment
```

---

### LLM Provider Pattern

Designed to switch LLM providers without modifying business logic. Each influencer can even use a different LLM.

Three provider types are supported:

- **`GeminiProvider`** — Google Gemini (native SDK)
- **`AnthropicProvider`** — Anthropic Claude (native SDK)
- **`OpenAICompatibleProvider`** — generic adapter for any OpenAI-spec API: OpenAI, DeepSeek, Qwen, Perplexity, Groq, Together, Mistral, Ollama, or any custom endpoint

Adding a new provider requires **zero code changes** — just set env vars:

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat        # optional — falls back to registry default
DEEPSEEK_BASE_URL=https://...       # optional — falls back to registry default
```

```python
# factory.py — provider resolution
def get_provider(provider_name: str) -> LLMProvider:
    if name == "gemini":    return GeminiProvider()
    if name == "anthropic": return AnthropicProvider()
    return OpenAICompatibleProvider(name)   # everything else
```

---

### Knowledge Base & RAG

Uses **pgvector** (native PostgreSQL extension) to avoid extra infrastructure.

RAG query flow on each response generation:

1. The incoming comment is converted to an embedding
2. The `k` most relevant fragments from the influencer's knowledge base are retrieved
3. Those fragments are injected into the prompt alongside the core system prompt
4. The LLM generates the response with that enriched context

---

### Meta Integration

Meta sends a `POST` to the webhook endpoint on every new comment. The backend:

1. Verifies the webhook signature (`X-Hub-Signature-256`)
2. Extracts the comment, author, and post reference
3. Identifies which virtual influencer the account belongs to
4. Triggers the Personality Engine to generate the response
5. Saves the comment + generated response to DB with status `PENDING`
6. Notifies the approval panel

When the team approves a response, the backend calls:
```
POST /{comment-id}/replies
Authorization: Bearer {page_access_token}
Body: { "message": "approved response" }
```

---

### Approval Panel

Internal Next.js interface where the team manages the pending response queue.

```
┌─────────────────────────────────────────────────────────┐
│  💬 @real_user  •  Post: "Outfit of the day 🌸"  •  5m  │
│  "omg I love it!! where did you get that jacket??"      │
├─────────────────────────────────────────────────────────┤
│  🤖 Suggested response  •  Gemini 2.5  •  Layla AI      │
│  "haha thanks!! I found it at a vintage shop in the     │
│   Roma district, you know I can't resist a thrift 🤌"   │
├─────────────────────────────────────────────────────────┤
│  [✅ Approve]  [✏️ Edit]  [🔄 Regenerate]  [❌ Ignore]  │
└─────────────────────────────────────────────────────────┘
```

---

## Database

### Main Tables

- **`users`** — panel users (email/password + Google SSO)
- **`influencers`** — virtual influencer profiles with system prompt
- **`social_accounts`** — connected social accounts per influencer
- **`comments`** — received comments from social networks
- **`pending_responses`** — AI-generated responses pending approval
- **`knowledge_entries`** — knowledge base with pgvector embeddings

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://virtualvoice:virtualvoice@db:5432/virtualvoice
SECRET_KEY=change-me-in-production
DEBUG=true
FRONTEND_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# LLM Provider — set to: gemini | anthropic | openai | deepseek | qwen | perplexity | groq | mistral | ollama | <any>
LLM_PROVIDER=gemini
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
# OpenAI-compatible providers: set {PROVIDER}_API_KEY (required), {PROVIDER}_BASE_URL and {PROVIDER}_MODEL (optional)
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
GROQ_API_KEY=

# Meta / Facebook Graph API
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
```

### Frontend (`frontend/.env`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
API_URL=http://backend:8000
AUTH_SECRET=change-me-in-production
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Local Development

### Prerequisites

- Docker + Docker Compose
- Google Cloud project with OAuth credentials (for Google SSO)

### Run everything

```bash
# Clone and configure
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Fill in your credentials in both .env files

# Start all services
docker compose up
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- PostgreSQL: localhost:5433

### Run migrations (first time)

```bash
docker compose exec backend alembic upgrade head
```

---

## Deployment

Same pattern as Bioflow: **monorepo with independent deployment per service**.

### Backend → Railway

1. Connect the repository to Railway
2. Set **Root Directory** to `backend/`
3. Add environment variables
4. Provision a PostgreSQL database and enable pgvector:
   ```sql
   CREATE EXTENSION vector;
   ```

### Frontend → Vercel

1. Connect the repository to Vercel
2. Set **Root Directory** to `frontend/`
3. Framework preset: **Next.js**
4. Add environment variables (`NEXT_PUBLIC_API_URL` pointing to Railway)

---

## Workflow

```
1. User leaves a comment on the virtual influencer's post
        │
        ▼
2. Meta sends webhook to backend
        │
        ▼
3. Personality Engine builds the prompt:
   system_prompt_core + RAG(knowledge_base) + post_context + comment
        │
        ▼
4. LLM generates response in the influencer's voice
        │
        ▼
5. Comment + response saved to DB (status: PENDING)
        │
        ▼
6. Approval panel shows the card to the team
        │
        ├── [Approve] → published immediately on Meta
        │               → response saved as voice_example
        │
        ├── [Edit]    → team modifies text → publishes
        │               → edit recorded for quality analysis
        │
        ├── [Regenerate] → new LLM call with same context
        │
        └── [Ignore] → archived without publishing
```

---

*Private project — all rights reserved.*
