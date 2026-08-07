# Phase 1 — Backend Core (MVP) 🔧

> Minimum viable functionality: receive comments, generate a response via LLM, approve and publish.

## 1.1 — Models & Schemas ✅

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

## 1.2 — Authentication ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `POST /auth/register` | Email/password registration with bcrypt hashing | 🟢 | ✅ Done |
| 2 | `POST /auth/login` | JWT generation on valid credentials | 🟢 | ✅ Done |
| 3 | `POST /auth/google` | Verify Google token, create or sync user | 🟡 | ✅ Done |
| 4 | `GET /auth/me` | Return current authenticated user | 🟢 | ✅ Done |
| 5 | `get_current_user` middleware | JWT validation dependency for protected routes | 🟢 | ✅ Done |
| 6 | Google SSO fields on User | `google_id`, `avatar_url`, `auth_provider` + migration | 🟢 | ✅ Done |

## 1.3 — LLM Provider Layer ✅

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

## 1.4 — Personality Engine ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `PromptBuilder` | Assembles final prompt: system prompt + RAG fragments + post context + comment | 🟡 | ✅ Done |
| 2 | `PersonalityEngine` | Async orchestration: `build_prompt` → `get_provider` → `generate` | 🟡 | ✅ Done |
| 3 | RAG fallback | Recency-order fallback when pgvector is unavailable | 🟢 | ✅ Done |
| 4 | Unit tests — Personality Engine | 12 tests: PromptBuilder ×6, PersonalityEngine ×4, RAG ×2 | 🟡 | ✅ Done |

## 1.5 — Meta Integration ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Webhook verification (`GET /webhooks/meta`) | Token challenge handshake; `hub.mode/challenge/verify_token` aliases | 🟢 | ✅ Done |
| 2 | Comment reception (`POST /webhooks/meta`) | Parse comment payload and trigger Personality Engine | 🟡 | ✅ Done |
| 3 | Signature verification | `X-Hub-Signature-256` HMAC validation on every request | 🟡 | ✅ Done |
| 4 | Publish approved response | `POST /{comment-id}/replies` via Meta Graph API (async httpx) | 🟡 | ✅ Done |
| 5 | Page Access Token manager | `token_manager.py` — store and refresh Page Access Tokens | 🔴 | ✅ Done |

## 1.6 — REST API Endpoints ✅

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

## 1.7 — Security & Rate Limiting ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `slowapi` integration | Limiter wired into FastAPI `app.state` + `RateLimitExceeded` handler | 🟢 | ✅ Done |
| 2 | Real IP extraction | `get_client_ip` reads `X-Forwarded-For` (Railway proxy) before falling back to remote host | 🟢 | ✅ Done |
| 3 | Auth endpoint limits | register 5/h · login 10/min · google 20/min · me 60/min | 🟢 | ✅ Done |
| 4 | Response endpoint limits | list 60/min · approve 30/min · ignore 60/min · regenerate 10/min | 🟢 | ✅ Done |
| 5 | Influencer & Knowledge limits | reads 60/min · writes/updates 20-30/min | 🟢 | ✅ Done |
| 6 | Webhook limits | verify 20/min · Meta events 300/min (burst-tolerant) | 🟢 | ✅ Done |

## 1.8 — Backend Tests 🔧

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | pytest + pytest-asyncio setup | `pytest.ini` with `asyncio_mode=auto`; `conftest.py` with SDK mocks | 🟢 | ✅ Done |
| 2 | Unit tests — LLM providers | 13 tests (Gemini, Anthropic, OpenAICompatible, factory) | 🟡 | ✅ Done |
| 3 | Unit tests — Personality Engine | 12 tests (PromptBuilder, PersonalityEngine, RAG) | 🟡 | ✅ Done |
| 4 | API endpoint tests | 17 tests (influencers, knowledge, responses, webhooks) | 🟡 | ✅ Done |
| 5 | Integration tests — auth endpoints | Register, login, Google SSO, protected route | 🟡 | ✅ Done |
| 6 | Minimum 80% coverage | Enforce with `pytest --cov` in CI | 🟡 | ✅ Done |


---

[← Roadmap](README.md)
