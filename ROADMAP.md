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
| 5 | Page Access Token manager | `token_manager.py` — store and refresh Page Access Tokens | 🔴 | ✅ Done |

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

#### 2.2 — Approval Queue ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `/dashboard/queue` | Pending response list page | 🟡 | ✅ Done |
| 2 | `ApprovalCard` component | Original comment + suggested response + action buttons | 🟡 | ✅ Done |
| 3 | Approve action | One-click publish to Meta | 🟢 | ✅ Done |
| 4 | Inline edit action | Edit response text before publishing | 🟢 | ✅ Done |
| 5 | Regenerate action | Request new LLM response | 🟢 | ✅ Done |
| 6 | Ignore action | Archive without publishing | 🟢 | ✅ Done |
| 7 | Filter by influencer | Dropdown to scope queue to one influencer | 🟢 | ✅ Done |
| 8 | Real-time updates | Polling every 30s | 🔴 | ✅ Done |

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

#### 2.6 — UX Polish ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Translate dashboard to English | All pages, components, labels, and error messages translated from Spanish | 🟢 | ✅ Done |
| 2 | Robust API error handling | `apiFetch` catches network failures and HTML responses (non-JSON); shows friendly messages instead of raw parse errors | 🟢 | ✅ Done |
| 3 | Contextual empty states | Knowledge Base shows "Create an influencer first" guidance when no influencers exist instead of a raw API error | 🟢 | ✅ Done |

---

### Phase 3 — RAG + Multi-influencer ✅

> Real intelligence: semantic embeddings, vector search, and full multi-account support.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Enable pgvector on Railway | `CREATE EXTENSION vector;` on production DB | 🟢 | ✅ Done |
| 2 | Embedding generation | `_embed.py` — Gemini text-embedding-004, 768 dims; hooked into knowledge CRUD | 🟡 | ✅ Done |
| 3 | RAG search (`rag.py`) | Cosine similarity via pgvector; graceful fallback to recency order | 🟡 | ✅ Done |
| 4 | RAG integration | Fragments injected into Personality Engine via `prompt_builder.py` | 🟢 | ✅ Done |
| 5 | Feedback loop | Approved/edited responses saved as `voice_examples` on approve | 🟡 | ✅ Done |
| 6 | Full multi-influencer | Webhook routing by social account → influencer; per-influencer filters in UI | 🟡 | ✅ Done |

---

### Phase 4 — Quality & Intelligence ✅

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Dynamic situational context | Inject current mood, recent posts, trends into prompt | 🔴 | ✅ Done |
| 2 | Metrics dashboard | Approval rate, edit rate, rejection rate per influencer | 🟡 | ✅ Done |
| 3 | Automatic token renewal | Auto-refresh Meta Page Access Tokens before expiry | 🔴 | ✅ Done |

---

### Phase 4.5 — Platform Expansion ⬜

> Each platform is a new adapter under `core/platforms/`. No changes to the Personality Engine.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Slack notifications | Alert team on new pending comments | 🟡 | ⬜ Pending |
| 2 | Threads support | Extend Meta integration to Threads (pending Meta API availability) | 🔴 | ⬜ Pending |
| 3 | Twitter/X — read mentions | Read mentions and replies via Twitter API v2 | 🔴 | ⬜ Pending |
| 4 | Twitter/X — publish response | Publish approved reply via Twitter API v2 | 🔴 | ⬜ Pending |
| 5 | TikTok — read comments | Read comments via TikTok for Developers API | 🔴 | ⬜ Pending |
| 6 | TikTok — publish response | Publish approved comment reply | 🔴 | ⬜ Pending |
| 7 | OnlyFans | Research available API; official API is limited | 🔴 | ⬜ Pending |
| 8 | Frontend — platform selector | Filter approval queue by platform | 🟢 | ⬜ Pending |

---

### Phase 5 — Production ⬜

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Deploy backend on Railway | FastAPI service + environment variables | 🟡 | ✅ Done |
| 2 | PostgreSQL on Railway | Provision DB + enable pgvector extension | 🟢 | ✅ Done |
| 3 | Deploy frontend on Vercel | Next.js app with `NEXT_PUBLIC_API_URL` pointing to Railway | 🟢 | ✅ Done |
| 4 | Configure Meta webhooks | Register callback URL in Meta Developer Console | 🟡 | ✅ Done |
| 5 | Production environment variables | All secrets configured in Railway and Vercel | 🟢 | ✅ Done |
| 6 | CI/CD — GitHub Actions | Run tests on every PR; block merge on failure | 🟡 | ✅ Done |
| 7 | Error monitoring | Sentry or Railway native logs + alerting | 🟡 | ⬜ Pending |

---

### Phase 5.5 — Voice Layer (ElevenLabs) ⬜

> Give each influencer a unique, cloneable voice. Text responses become audio responses.
> All tasks in this phase require an ElevenLabs API key (`ELEVENLABS_API_KEY`).

#### Infrastructure notes

| Concern | Decision | Why |
|---------|----------|-----|
| Audio storage | **Cloudflare R2** (recommended) or Supabase Storage | Railway has no blob storage. R2 = $0.015/GB, zero egress fees, S3-compatible API. Supabase Storage = free up to 1 GB, simpler if already using Supabase. |
| Backend changes | Deploy on Railway (same service) | Only new env vars needed: `ELEVENLABS_API_KEY`, `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` |
| Audio generation | On-demand + cache (Option B) | Generate once on response creation, store URL in DB. Re-requests serve the cached URL — zero repeat API cost. |
| ElevenLabs TTS endpoint | `POST /v1/text-to-speech/{voice_id}` | Returns MP3 bytes. Pass `model_id=eleven_turbo_v2_5` for lowest latency. |
| Cache key | `SHA256(text + voice_id + stability + similarity)` | Same text + same settings = same audio. Avoids duplicates. |

---

#### 5.5.1 — Foundation (Backend)

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | DB: voice fields on Influencer | Add `voice_id VARCHAR`, `voice_name VARCHAR`, `voice_preview_url VARCHAR`, `voice_stability FLOAT DEFAULT 0.5`, `voice_similarity FLOAT DEFAULT 0.75` to `influencers` + migration | 🟢 | ⬜ Pending |
| 2 | DB: audio fields on PendingResponse | Add `audio_url VARCHAR`, `audio_cache_key VARCHAR` to `pending_responses` + migration | 🟢 | ⬜ Pending |
| 3 | `_voice.py` — ElevenLabs synthesis | `async synthesize(text, voice_id, stability, similarity) → bytes` — calls `POST /v1/text-to-speech/{voice_id}` with `eleven_turbo_v2_5` model | 🟡 | ⬜ Pending |
| 4 | `_storage.py` — R2/S3 upload | `async upload_audio(key: str, data: bytes) → str` — uploads MP3 to R2, returns public URL; checks if key already exists before uploading (cache hit) | 🟡 | ⬜ Pending |
| 5 | `VoiceService` — orchestrator | `async generate_and_cache(text, influencer) → str` — computes cache key, hits storage first, calls ElevenLabs only on miss, stores result | 🟡 | ⬜ Pending |
| 6 | `GET /voices` endpoint | Proxy ElevenLabs `GET /v1/voices` — returns list of available voices (id, name, preview_url) for the UI dropdown | 🟢 | ⬜ Pending |
| 7 | `POST /voices/generate` endpoint | `{ text, voice_id, stability, similarity }` → runs `VoiceService.generate_and_cache` → returns `{ audio_url, cache_key, cached: bool }` | 🟡 | ⬜ Pending |
| 8 | Rate limit voice endpoints | `POST /voices/generate`: 20/min (ElevenLabs quota protection) | 🟢 | ⬜ Pending |

#### 5.5.2 — Generate Voices UI (`/dashboard/voices`)

> New sidebar menu item: **Generate Voices**. Lets the operator generate and preview audio from any text and assign a voice to an influencer.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Add "Generate Voices" to sidebar | New nav item with mic icon linking to `/dashboard/voices` | 🟢 | ⬜ Pending |
| 2 | Voice catalog panel | Fetch `GET /voices`, display grid of available ElevenLabs voices with name + "▶ Preview" button (plays `preview_url`) | 🟡 | ⬜ Pending |
| 3 | Influencer selector | Dropdown listing all influencers; shows current assigned `voice_id` if any | 🟢 | ⬜ Pending |
| 4 | Text-to-speech playground | Textarea for input text + stability/similarity sliders + "Generate" button → calls `POST /voices/generate` → plays returned audio inline | 🟡 | ⬜ Pending |
| 5 | Assign voice to influencer | "Assign to [influencer]" button on voice card → calls `PATCH /influencers/{id}` with `{ voice_id, voice_name, voice_preview_url, voice_stability, voice_similarity }` — saves both the voice ID and the catalog sample URL | 🟢 | ⬜ Pending |
| 6 | Voice assignment badge on influencer | Show assigned voice name + "▶" button in `InfluencerCard` that plays the stored `voice_preview_url` directly (no API call needed) | 🟢 | ⬜ Pending |
| 7 | Download generated audio | Download button on playground result (MP3) | 🟢 | ⬜ Pending |
| 8 | Unit tests — VoicesPage | Mock `GET /voices`, `POST /voices/generate`, verify generate + assign flow | 🟡 | ⬜ Pending |

#### 5.5.3 — Approval Queue Integration

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Auto-generate audio on response creation | After LLM generates response text, trigger `VoiceService.generate_and_cache` as background task if influencer has `voice_id` | 🟡 | ⬜ Pending |
| 2 | Audio preview in ApprovalCard | Add "▶ Preview" button; plays `audio_url` if ready, shows spinner + "Generating…" while pending | 🟢 | ⬜ Pending |
| 3 | Audio DM publishing | On approve: if `audio_url` exists, send voice message DM via Instagram API alongside text reply | 🔴 | ⬜ Pending |

#### 5.5.4 — Content Generation

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Script-to-audio export | Given a script (manual or LLM-generated), produce downloadable MP3 for Reels / Stories narration | 🟡 | ⬜ Pending |
| 2 | Weekly audio snippet (cron) | LLM generates a short monologue based on `current_context`, ElevenLabs converts to audio, stored in R2, available for download | 🔴 | ⬜ Pending |

#### 5.5.5 — Conversational Voice (Advanced)

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Real-time voice WebSocket | ElevenLabs Conversational AI endpoint with `system_prompt_core` + knowledge base as context; low-latency back-and-forth | 🔴 | ⬜ Pending |
| 2 | Phone hotline via Twilio | Twilio TwiML → ElevenLabs Conversational AI → fans call a real number and talk to the influencer | 🔴 | ⬜ Pending |

---

### Phase 6 — Security Hardening ⬜

> Findings from a full security review (2026-04-20). Ordered by severity.
> Reference implementation: [bioflow](../bioflow) — `sanitize.py`, `url_security.py`, `token_denylist.py`, `next.config.ts` headers.

#### 6.1 — Critical

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Fix webhook signature verification | Exclude `/webhooks/meta` from `GZipMiddleware` so HMAC runs on raw bytes — currently ANY caller can POST spoofed webhooks | 🟡 | ✅ Done |
| 2 | Verify Google ID token server-side | `POST /auth/google` trusts unverified `google_id`/`email` from request body — anyone can impersonate any user. Replace with `id_token.verify_oauth2_token()` | 🟡 | ✅ Done |
| 3 | Bind OAuth callback to initiating session | Instagram callback is not tied to the user who started the flow. Embed `user_id` in state + add `get_current_user` dependency to the callback endpoint | 🟡 | ✅ Done |

#### 6.2 — High

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Restrict user registration | `POST /auth/register` is fully public — any user can register and immediately approve/publish responses. Add admin-controlled allow-list or invite token | 🟢 | ✅ Done |

> **Re-enabling open registration (when needed):**
> The platform is currently invite-only. To re-open self-serve registration:
> 1. **Backend** — set `REGISTRATION_ENABLED=true` in Railway env vars (already implemented in `config.py`)
> 2. **Frontend** — restore the register link in `frontend/src/app/(auth)/login/page.tsx`:
>    ```tsx
>    import Link from "next/link";
>    // ...inside the card, after <SSOButtons />:
>    <p className="text-center text-sm text-gray-500">
>      No account yet?{" "}
>      <Link href="/register" className="text-brand hover:underline font-medium">
>        Create one
>      </Link>
>    </p>
>    ```
>    The `/register` page (`frontend/src/app/(auth)/register/page.tsx`) remains intact.
| 2 | Add admin guards to destructive endpoints | `DELETE /social-accounts/{id}`, `PATCH/DELETE /knowledge/{id}` — all lack ownership checks (IDOR). Require `is_admin=True` | 🟢 | ✅ Done |
| 3 | Derive `approved_by` from session | Currently a free-form client-supplied string — attacker can set any value. Use `current_user.email` server-side instead | 🟢 | ✅ Done |
| 4 | Separate OAuth state secret from JWT secret | `sign_state()` reuses `settings.secret_key`. Add dedicated `META_OAUTH_STATE_SECRET` env var | 🟢 | ✅ Done |
| 5 | Frontend security headers (CSP + HSTS) | `next.config.ts` has no `Content-Security-Policy`, `Strict-Transport-Security`, or `Permissions-Policy`. Port from bioflow `next.config.ts` | 🟡 | ✅ Done |
| 6 | Reduce JWT lifetime + add token revocation | JWT expires in 7 days with no revocation. Reduce to 1h + add `token_denylist` table. Port from bioflow `token_denylist.py` | 🔴 | ✅ Done |

#### 6.3 — Medium

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Fix rate limiter IP extraction | `get_client_ip()` reads raw `X-Forwarded-For` — spoofable. Use `request.client.host` (already resolved by `ProxyHeadersMiddleware`) | 🟢 | ✅ Done |
| 2 | Encrypt Meta access tokens at rest | `social_accounts.access_token` is plaintext in DB. Use Fernet or KMS; decrypt only at point of use | 🔴 | ✅ Done |
| 3 | URL-encode OAuth error redirect param | `oauth_error` value reflected unencoded into redirect URL. Apply `urllib.parse.quote(error, safe='')` | 🟢 | ✅ Done |
| 4 | Add pagination to unbounded list endpoints | `GET /responses/pending`, `/knowledge/`, `/social-accounts/`, `/influencers/` have no `LIMIT` — add `.limit(200)` | 🟢 | ✅ Done |
| 5 | Add production debug guard | Add startup assertion: `DEBUG` must be `false` when `RAILWAY_ENVIRONMENT=production` | 🟢 | ✅ Done |
| 6 | Fix inconsistent API URL fallback | `frontend/src/app/(auth)/register/page.tsx` hardcodes `localhost:8001` while `lib/api.ts` uses `localhost:8000` | 🟢 | ✅ Done |
| 7 | Port input sanitization utilities from bioflow | Add `sanitize.py` (`strip_html`, `validate_slug`) and apply to influencer and knowledge entry schemas | 🟡 | ✅ Done |

#### 6.4 — Low / Housekeeping

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Add secret leak detection pre-commit hook | Add `gitleaks` or `detect-secrets` to prevent accidental `.env` commits | 🟢 | ✅ Done |
| 2 | Remove unused `access_token` from `SocialAccountCreate` schema | Schema exposes a field with no route — remove or delete the schema entirely | 🟢 | ✅ Done |

---

*Last updated: 2026-04-25 (Phase 4 complete · Phase 5.5 expanded with Generate Voices UI + infrastructure architecture · Phase 6 security hardening complete · /studio superadmin section added)*
