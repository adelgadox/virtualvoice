# VirtualVoice Roadmap

> **Complexity:** 🟢 Low · 🟡 Medium · 🔴 High
> **Status:** ✅ Done · 🔧 In Progress · ⬜ Pending

---

### Phase 0 — Base Infrastructure ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Monorepo structure | `backend/` + `frontend/` with independent deployments | 🟢 | ✅ Done |
| 2 | Backend Dockerfile | Multi-stage build, Python 3.12-slim | 🟢 | ✅ Done |
| 3 | Docker Compose | Local env: db:5433, backend:8001, frontend:3000 | 🟢 | ✅ Done |
| 4 | Python dependencies | FastAPI, SQLAlchemy, Alembic, pgvector, Pydantic v2 | 🟢 | ✅ Done |
| 5 | Pydantic Settings | `config.py` with environment variable management | 🟢 | ✅ Done |
| 6 | Alembic + initial migration | Tables created, migrations workflow established | 🟡 | ✅ Done |
| 7 | FastAPI entry point | CORS, rate limiting, router registration in `main.py` | 🟢 | ✅ Done |
| 8 | Environment variables | `.env.example` for backend and frontend | 🟢 | ✅ Done |

---

### Phase 1 — Backend Core (MVP) 🔧

> Minimum viable functionality: receive comments, generate a response via LLM, approve and publish.

#### 1.1 — Models & Schemas ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `User` model | `google_id`, `avatar_url`, `auth_provider`; nullable `hashed_password` | 🟢 | ✅ Done |
| 2 | `Influencer` model | Name, slug, `system_prompt_core`, `llm_provider` override | 🟢 | ✅ Done |
| 3 | `SocialAccount` model | Connected social accounts per influencer | 🟢 | ✅ Done |
| 4 | `Comment` model | Platform comment ID, author, content, post context | 🟢 | ✅ Done |
| 5 | `PendingResponse` model | Generated response with approval status | 🟢 | ✅ Done |
| 6 | `KnowledgeEntry` model | Per-influencer knowledge base with pgvector embedding column | 🟡 | ✅ Done |
| 7 | Pydantic schemas | Auth, influencer, response, knowledge entry schemas | 🟢 | ✅ Done |
| 8 | pgvector migration | `CREATE EXTENSION vector` + `embedding` column on `knowledge_entries` | 🟡 | ✅ Done |

#### 1.2 — Authentication ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `POST /auth/register` | Email/password registration with bcrypt hashing | 🟢 | ✅ Done |
| 2 | `POST /auth/login` | JWT generation on valid credentials | 🟢 | ✅ Done |
| 3 | `POST /auth/google` | Verify Google token, create or sync user | 🟡 | ✅ Done |
| 4 | `GET /auth/me` | Return current authenticated user | 🟢 | ✅ Done |
| 5 | `get_current_user` middleware | JWT validation dependency for protected routes | 🟢 | ✅ Done |
| 6 | Google SSO fields on User | `google_id`, `avatar_url`, `auth_provider` + migration | 🟢 | ✅ Done |

#### 1.3 — LLM Provider Layer ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Abstract `LLMProvider` interface | `async generate(system_prompt, user_message) -> str` | 🟢 | ✅ Done |
| 2 | `GeminiProvider` | Google Gemini via native SDK (`generate_content_async`) | 🟡 | ✅ Done |
| 3 | `AnthropicProvider` | Anthropic Claude via native SDK (`AsyncAnthropic`) | 🟡 | ✅ Done |
| 4 | `OpenAICompatibleProvider` | Generic adapter: OpenAI, DeepSeek, Qwen, Perplexity, Groq, Mistral, Ollama, any custom endpoint | 🟡 | ✅ Done |
| 5 | `get_provider()` factory | Resolves provider from `LLM_PROVIDER` env var; zero code changes to add new providers | 🟢 | ✅ Done |
| 6 | Unit tests — LLM providers | 13 tests: Gemini, Anthropic, OpenAICompatible ×4, factory ×3 | 🟡 | ✅ Done |

> Adding a new provider requires only env vars — no code changes:
> ```env
> LLM_PROVIDER=deepseek
> DEEPSEEK_API_KEY=sk-...
> DEEPSEEK_MODEL=deepseek-chat    # optional
> DEEPSEEK_BASE_URL=https://...   # optional
> ```

#### 1.4 — Personality Engine ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `PromptBuilder` | Assembles final prompt: system prompt + RAG fragments + post context + comment | 🟡 | ✅ Done |
| 2 | `PersonalityEngine` | Async orchestration: `build_prompt` → `get_provider` → `generate` | 🟡 | ✅ Done |
| 3 | RAG fallback | Recency-order fallback when pgvector is unavailable | 🟢 | ✅ Done |
| 4 | Unit tests — Personality Engine | 12 tests: PromptBuilder ×6, PersonalityEngine ×4, RAG ×2 | 🟡 | ✅ Done |

#### 1.5 — Meta Integration ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Webhook verification (`GET /webhooks/meta`) | Token challenge handshake; `hub.mode/challenge/verify_token` aliases | 🟢 | ✅ Done |
| 2 | Comment reception (`POST /webhooks/meta`) | Parse comment payload and trigger Personality Engine | 🟡 | ✅ Done |
| 3 | Signature verification | `X-Hub-Signature-256` HMAC validation on every request | 🟡 | ✅ Done |
| 4 | Publish approved response | `POST /{comment-id}/replies` via Meta Graph API (async httpx) | 🟡 | ✅ Done |
| 5 | Page Access Token manager | `token_manager.py` — store and refresh Page Access Tokens | 🔴 | ⬜ Pending |

#### 1.6 — REST API Endpoints ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `GET /influencers` | List all influencers | 🟢 | ✅ Done |
| 2 | `POST /influencers` | Create influencer with personality profile | 🟢 | ✅ Done |
| 3 | `PATCH /influencers/{id}` | Update influencer name, prompt, LLM provider | 🟢 | ✅ Done |
| 4 | `GET /responses/pending` | Paginated pending response queue | 🟢 | ✅ Done |
| 5 | `GET /responses/history` | Resolved responses history | 🟢 | ✅ Done |
| 6 | `POST /responses/{id}/approve` | Approve + publish to Meta; async with token lookup | 🟡 | ✅ Done |
| 7 | `POST /responses/{id}/ignore` | Ignore a pending response | 🟢 | ✅ Done |
| 8 | `POST /responses/{id}/regenerate` | Trigger new LLM generation with same context | 🟡 | ✅ Done |
| 9 | `GET /knowledge` | List knowledge base entries by influencer | 🟢 | ✅ Done |
| 10 | `POST /knowledge` | Add a new knowledge entry | 🟢 | ✅ Done |
| 11 | `PATCH /knowledge/{id}` | Update knowledge entry | 🟢 | ✅ Done |
| 12 | `DELETE /knowledge/{id}` | Soft-delete a knowledge entry | 🟢 | ✅ Done |

#### 1.7 — Security & Rate Limiting ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `slowapi` integration | Limiter wired into FastAPI `app.state` + `RateLimitExceeded` handler | 🟢 | ✅ Done |
| 2 | Real IP extraction | `get_client_ip` reads `X-Forwarded-For` (Railway proxy) before falling back to remote host | 🟢 | ✅ Done |
| 3 | Auth endpoint limits | register 5/h · login 10/min · google 20/min · me 60/min | 🟢 | ✅ Done |
| 4 | Response endpoint limits | list 60/min · approve 30/min · ignore 60/min · regenerate 10/min | 🟢 | ✅ Done |
| 5 | Influencer & Knowledge limits | reads 60/min · writes/updates 20-30/min | 🟢 | ✅ Done |
| 6 | Webhook limits | verify 20/min · Meta events 300/min (burst-tolerant) | 🟢 | ✅ Done |

#### 1.8 — Backend Tests 🔧

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | pytest + pytest-asyncio setup | `pytest.ini` with `asyncio_mode=auto`; `conftest.py` with SDK mocks | 🟢 | ✅ Done |
| 2 | Unit tests — LLM providers | 13 tests (Gemini, Anthropic, OpenAICompatible, factory) | 🟡 | ✅ Done |
| 3 | Unit tests — Personality Engine | 12 tests (PromptBuilder, PersonalityEngine, RAG) | 🟡 | ✅ Done |
| 4 | API endpoint tests | 17 tests (influencers, knowledge, responses, webhooks) | 🟡 | ✅ Done |
| 5 | Integration tests — auth endpoints | Register, login, Google SSO, protected route | 🟡 | ✅ Done |
| 6 | Minimum 80% coverage | Enforce with `pytest --cov` in CI | 🟡 | ✅ Done |

---

### Phase 2 — Frontend (Approval Panel) 🔧

> Internal Next.js interface to manage the response queue and configure influencers.

#### 2.1 — Setup ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Next.js 15 + TypeScript + Tailwind v4 | App Router, ESM PostCSS config | 🟢 | ✅ Done |
| 2 | NextAuth v5 | Credentials + Google providers, JWT strategy | 🟡 | ✅ Done |
| 3 | Auth layout | Purple gradient background, white card, `(auth)/` route group | 🟢 | ✅ Done |
| 4 | Login page | Email/password + Google SSO button | 🟢 | ✅ Done |
| 5 | Register page | Email/password + Google SSO button | 🟢 | ✅ Done |
| 6 | Route protection | Redirect to `/login` if no valid session | 🟢 | ✅ Done |
| 7 | Dashboard layout | Sidebar (desktop) + bottom nav (mobile) | 🟡 | ✅ Done |
| 8 | HTTP client | `lib/api.ts` with auth token injection | 🟢 | ✅ Done |

#### 2.2 — Approval Queue ⬜

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `/dashboard/queue` | Pending response list page | 🟡 | ⬜ Pending |
| 2 | `ApprovalCard` component | Original comment + suggested response + action buttons | 🟡 | ⬜ Pending |
| 3 | Approve action | One-click publish to Meta | 🟢 | ⬜ Pending |
| 4 | Inline edit action | Edit response text before publishing | 🟢 | ⬜ Pending |
| 5 | Regenerate action | Request new LLM response | 🟢 | ⬜ Pending |
| 6 | Ignore action | Archive without publishing | 🟢 | ⬜ Pending |
| 7 | Filter by influencer | Dropdown to scope queue to one influencer | 🟢 | ⬜ Pending |
| 8 | Real-time updates | Polling or WebSocket for new comments | 🔴 | ⬜ Pending |

#### 2.3 — Influencer Management ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `/dashboard/influencers` | Influencer list with status badges | 🟢 | ✅ Done |
| 2 | Create / edit form | Name, slug, LLM provider selector | 🟡 | ✅ Done |
| 3 | System prompt editor | Textarea with character count and preview | 🟡 | ✅ Done |

#### 2.4 — Knowledge Base Editor ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `/dashboard/knowledge` | Entries grouped by influencer | 🟡 | ✅ Done |
| 2 | Add / edit / delete entries | CRUD UI for knowledge entries | 🟢 | ✅ Done |
| 3 | Category tags | biography, opinions, voice_examples, off_limits, etc. | 🟢 | ✅ Done |

#### 2.5 — Frontend Tests ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Unit tests — components | ApprovalCard (13), InfluencerCard (7), KnowledgeEntryRow (8) — 28 tests total | 🟡 | ✅ Done |
| 2 | E2E — login flow | Login with credentials, invalid creds, redirect, unauthenticated access | 🟡 | ✅ Done |
| 3 | E2E — approve response flow | Queue load, approve/ignore removes card, influencer filter | 🔴 | ✅ Done |

---

### Phase 3 — RAG + Multi-influencer ⬜

> Real intelligence: semantic embeddings, vector search, and full multi-account support.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Enable pgvector on Railway | `CREATE EXTENSION vector;` on production DB | 🟢 | ⬜ Pending |
| 2 | Embedding generation | Generate and store embeddings when saving knowledge entries (Gemini embeddings API) | 🟡 | ⬜ Pending |
| 3 | RAG search (`rag.py`) | Cosine similarity over `knowledge_entries.embedding` — top-k fragments | 🟡 | ⬜ Pending |
| 4 | RAG integration | Inject retrieved fragments into Personality Engine prompt | 🟢 | ⬜ Pending |
| 5 | Feedback loop | Approved/edited responses saved as `voice_examples` to improve future prompts | 🟡 | ⬜ Pending |
| 6 | Full multi-influencer | Webhook routing by social account → influencer; per-influencer filters in UI | 🟡 | ⬜ Pending |

---

### Phase 4 — Quality & Intelligence ⬜

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Dynamic situational context | Inject current mood, recent posts, trends into prompt | 🔴 | ⬜ Pending |
| 2 | Metrics dashboard | Approval rate, edit rate, rejection rate per influencer | 🟡 | ⬜ Pending |
| 3 | Slack notifications | Alert team on new pending comments | 🟡 | ⬜ Pending |
| 4 | Automatic token renewal | Auto-refresh Meta Page Access Tokens before expiry | 🔴 | ⬜ Pending |
| 5 | Threads support | Extend Meta integration to Threads (pending Meta API availability) | 🔴 | ⬜ Pending |

---

### Phase 4.5 — Platform Expansion ⬜

> Each platform is a new adapter under `core/platforms/`. No changes to the Personality Engine.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Twitter/X — read mentions | Read mentions and replies via Twitter API v2 | 🔴 | ⬜ Pending |
| 2 | Twitter/X — publish response | Publish approved reply via Twitter API v2 | 🔴 | ⬜ Pending |
| 3 | TikTok — read comments | Read comments via TikTok for Developers API | 🔴 | ⬜ Pending |
| 4 | TikTok — publish response | Publish approved comment reply | 🔴 | ⬜ Pending |
| 5 | OnlyFans | Research available API; official API is limited | 🔴 | ⬜ Pending |
| 6 | Frontend — platform selector | Filter approval queue by platform | 🟢 | ⬜ Pending |

---

### Phase 5 — Production ⬜

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Deploy backend on Railway | FastAPI service + environment variables | 🟡 | ✅ Done |
| 2 | PostgreSQL on Railway | Provision DB + enable pgvector extension | 🟢 | ✅ Done |
| 3 | Deploy frontend on Vercel | Next.js app with `NEXT_PUBLIC_API_URL` pointing to Railway | 🟢 | ✅ Done |
| 4 | Configure Meta webhooks | Register callback URL in Meta Developer Console | 🟡 | ⬜ Pending |
| 5 | Production environment variables | All secrets configured in Railway and Vercel | 🟢 | ✅ Done |
| 6 | CI/CD — GitHub Actions | Run tests on every PR; block merge on failure | 🟡 | ✅ Done |
| 7 | Error monitoring | Sentry or Railway native logs + alerting | 🟡 | ⬜ Pending |

---

*Last updated: 2026-04-19 (Phase 1.7 rate limiting complete · Phase 5 backend + frontend deployed)*
