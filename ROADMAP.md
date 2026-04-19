# ROADMAP — VirtualVoice

Development phases and current project status.

**Legend:** ✅ Complete · 🔧 In Progress · ⬜ Pending

---

## Phase 0 — Base Infrastructure
> Initial project setup, folder structure, and environment configuration.

| Task | Status | Notes |
|------|--------|-------|
| Monorepo structure `backend/` + `frontend/` | ✅ | |
| Backend `Dockerfile` | ✅ | Multi-stage, Python 3.12-slim |
| `docker-compose.yml` local | ✅ | db:5433, backend:8001, frontend:3000 |
| `requirements.txt` | ✅ | FastAPI, SQLAlchemy, Alembic, pgvector, etc. |
| Environment variables (`.env.example`) | ✅ | |
| Pydantic Settings config (`config.py`) | ✅ | |
| Alembic setup + initial migration | ✅ | Tables created in local DB |
| `main.py` with CORS, rate limit, routers | ✅ | |

---

## Phase 1 — Backend Core (MVP)
> Minimum viable functionality: receive comments, generate response, approve and publish.

### 1.1 Models & Schemas

| Task | Status | Notes |
|------|--------|-------|
| `User` model | ✅ | google_id, avatar_url, auth_provider |
| `Influencer` model | ✅ | |
| `SocialAccount` model | ✅ | |
| `Comment` model | ✅ | |
| `PendingResponse` model | ✅ | |
| `KnowledgeEntry` model | ✅ | |
| Pydantic schemas (influencer, response, knowledge, auth) | ✅ | |
| pgvector migration — `embedding` column in `knowledge_entries` | ⬜ | Requires `CREATE EXTENSION vector` |

### 1.2 Authentication

| Task | Status | Notes |
|------|--------|-------|
| Email/password login (`POST /auth/login`) | ✅ | JWT implemented |
| Authentication middleware (`get_current_user`) | ✅ | |
| Password hashing with bcrypt | ✅ | |
| User registration (`POST /auth/register`) | ✅ | |
| Google SSO backend endpoint (`POST /auth/google`) | ✅ | Verifies Google token, creates/finds user |
| User model — Google fields (`google_id`, `avatar_url`, `auth_provider`) | ✅ | `hashed_password` is nullable |
| Migration for new user fields | ✅ | Applied |

### 1.3 LLM Provider Layer

| Task | Status | Notes |
|------|--------|-------|
| Abstract interface `LLMProvider` (`base.py`) | ✅ | |
| `GeminiProvider` | ✅ | Native SDK, `generate_content_async` |
| `AnthropicProvider` | ✅ | Native SDK, `AsyncAnthropic` |
| `OpenAICompatibleProvider` | ✅ | Generic adapter: OpenAI, DeepSeek, Qwen, Perplexity, Groq, Mistral, Ollama, any custom endpoint |
| `get_provider()` factory — selection by config | ✅ | `LLM_PROVIDER` env var; zero code changes to add new providers |

### 1.4 Personality Engine

| Task | Status | Notes |
|------|--------|-------|
| `PromptBuilder` — build system prompt from influencer | ✅ | Injects personality + knowledge fragments + post context |
| `PersonalityEngine` — orchestrate prompt + LLM | ✅ | `async generate()`, uses influencer's `llm_provider` |
| Basic RAG (without pgvector, static knowledge base) | ✅ | Fallback to recency order when pgvector unavailable |
| Unit tests — Personality Engine + PromptBuilder + RAG | ✅ | 12 tests passing |

### 1.5 Meta Integration

| Task | Status | Notes |
|------|--------|-------|
| Webhook verification (`GET /webhooks/meta`) | 🔧 | Router created |
| Comment reception (`POST /webhooks/meta`) | 🔧 | |
| Signature verification `X-Hub-Signature-256` | ⬜ | |
| Publish approved response (`graph_api.py`) | 🔧 | |
| `token_manager.py` — Page Access Token management | ⬜ | |

### 1.6 REST API — Endpoints

| Task | Status | Notes |
|------|--------|-------|
| `GET /influencers` — list influencers | 🔧 | Router created |
| `POST /influencers` — create influencer | 🔧 | |
| `GET /responses` — pending response queue | 🔧 | |
| `PATCH /responses/{id}/approve` — approve response | 🔧 | |
| `PATCH /responses/{id}/reject` — reject/ignore | 🔧 | |
| `POST /responses/{id}/regenerate` — regenerate with LLM | ⬜ | |
| `GET /knowledge` — list knowledge base entries | 🔧 | |
| `POST /knowledge` — add entry | 🔧 | |
| `DELETE /knowledge/{id}` — delete entry | ⬜ | |

### 1.7 Backend Tests

| Task | Status | Notes |
|------|--------|-------|
| pytest + pytest-asyncio setup | ✅ | `pytest.ini` with `asyncio_mode=auto`, `conftest.py` with SDK mocks |
| Unit tests — LLM providers (mock) | ✅ | 13 tests: Gemini, Anthropic, OpenAICompatible, factory |
| Unit tests — Personality Engine | ✅ | Covered in test_personality.py |
| Integration tests — auth endpoints | ⬜ | |
| Integration tests — responses endpoints | ⬜ | |
| Integration tests — webhook handler | ⬜ | |
| Minimum 80% coverage | ⬜ | |

---

## Phase 2 — Frontend (Approval Panel)
> Internal Next.js interface to manage the response queue.

### 2.1 Setup

| Task | Status | Notes |
|------|--------|-------|
| Next.js 15 + TypeScript + Tailwind | ✅ | |
| next-auth v5 installed | ✅ | |
| HTTP client to backend (`lib/api.ts`) | ✅ | |
| Auth group layout with gradient background | ✅ | |
| Login page (email/pass + Google SSO) | ✅ | `/login` |
| Register page (email/pass + Google SSO) | ✅ | `/register` |
| NextAuth config — Credentials + Google providers | ✅ | |
| Route protection — redirect to `/login` if not authenticated | ✅ | |
| Dashboard layout with sidebar (desktop + mobile bottom nav) | ✅ | |

### 2.2 Approval Queue

| Task | Status | Notes |
|------|--------|-------|
| `/dashboard/queue` — pending response list | ⬜ | |
| `ApprovalCard` component — comment + response + actions | ⬜ | |
| Approve action | ⬜ | |
| Inline edit action | ⬜ | |
| Regenerate action | ⬜ | |
| Ignore action | ⬜ | |
| Filter by influencer | ⬜ | |
| Polling or WebSocket for real-time updates | ⬜ | |

### 2.3 Influencer Management

| Task | Status | Notes |
|------|--------|-------|
| `/dashboard/influencers` — influencer list | ⬜ | |
| Create/edit influencer form | ⬜ | |
| System prompt editor | ⬜ | |

### 2.4 Knowledge Base Editor

| Task | Status | Notes |
|------|--------|-------|
| `/dashboard/knowledge` — entries by influencer | ⬜ | |
| Add / edit / delete entries | ⬜ | |
| Categories: biography, opinions, voice_examples, off_limits, etc. | ⬜ | |

### 2.5 Frontend Tests

| Task | Status | Notes |
|------|--------|-------|
| Unit tests — main components | ⬜ | |
| E2E tests — approve response flow | ⬜ | |
| E2E tests — login and protected access | ⬜ | |

---

## Phase 3 — RAG + Multi-influencer
> Real intelligence: embeddings, semantic search, and multi-account support.

| Task | Status | Notes |
|------|--------|-------|
| Enable `pgvector` extension on Railway | ⬜ | `CREATE EXTENSION vector;` |
| Generate embeddings when saving knowledge entries | ⬜ | Use Gemini embeddings API |
| Implement RAG search in `rag.py` | ⬜ | `k` most relevant fragments by cosine similarity |
| Integrate RAG into Personality Engine | ⬜ | |
| Feedback loop: approved responses → voice_examples automatically | ⬜ | |
| Full multi-influencer support (filters, selection in webhook) | ⬜ | |

---

## Phase 4 — Quality & Intelligence
> Metrics, notifications, and dynamic situational context.

| Task | Status | Notes |
|------|--------|-------|
| Dynamic situational context (mood, recent posts) | ⬜ | |
| Metrics dashboard: approval rate, edit rate, rejection rate | ⬜ | |
| Slack notifications for new comments | ⬜ | |
| Automatic Meta Page Access Token renewal | ⬜ | |
| Threads support (pending Meta API opening) | ⬜ | |

---

## Phase 4.5 — Platform Expansion
> Integrate networks beyond Meta. Each platform is a new adapter in `core/platforms/`.

| Task | Status | Notes |
|------|--------|-------|
| Twitter/X — read mentions and replies via API v2 | ⬜ | Requires Twitter Developer App |
| Twitter/X — publish approved response | ⬜ | |
| TikTok — read comments via TikTok API | ⬜ | TikTok for Developers |
| TikTok — publish approved response | ⬜ | |
| OnlyFans — research available API | ⬜ | Official API limited |
| Frontend panel — platform selector in filters | ⬜ | |

---

## Phase 5 — Production
> Deployment, security, and monitoring.

| Task | Status | Notes |
|------|--------|-------|
| Deploy backend on Railway | ⬜ | |
| Provision PostgreSQL on Railway + enable pgvector | ⬜ | |
| Deploy frontend on Vercel | ⬜ | |
| Configure webhooks in Meta Developer Console | ⬜ | |
| Production environment variables | ⬜ | |
| CI/CD — GitHub Actions (tests on every PR) | ⬜ | |
| Error monitoring (Sentry or Railway logs) | ⬜ | |

---

## Suggested Work Order

```
Phase 1.3 (LLM) → Phase 1.4 (Personality Engine) → Phase 1.5 (Meta)
→ Phase 1.6 (API endpoints) → Phase 1.7 (Tests)
→ Phase 2.2 (Approval Queue) → Phase 2.3 (Influencers) → Phase 2.4 (Knowledge)
→ Phase 3 (RAG) → Phase 4 → Phase 5
```

---

*Last updated: 2026-04-20 (Phase 1.3 + 1.4 complete)*
