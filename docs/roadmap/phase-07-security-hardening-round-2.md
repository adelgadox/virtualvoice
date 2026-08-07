# Phase 7 — Security Hardening Round 2 ✅

> Findings from a full security review conducted 2026-04-25.
> Ordered by severity within each section.

## 7.1 — Critical

| # | Task | Description | Severity | Status |
|---|------|-------------|----------|--------|
| 1 | Enforce token encryption at startup | `TOKEN_ENCRYPTION_KEY` is optional — if unset, Meta access tokens are stored in **plaintext** in the DB. Raise `RuntimeError` in `lifespan` if key is empty or invalid Fernet format. Remove the conditional in `social_accounts.py:132` and `token_manager.py:123` — always encrypt. | 🔴 CRITICAL | ✅ Done |
| 2 | Authenticate Instagram OAuth callback | `GET /social-accounts/instagram/callback` has no auth guard. Added `exp` field (10-min window) to state payload + verify `initiating_user_id` is an active DB user on callback. Prevents replayed/stale states and IDOR via deactivated accounts. | 🔴 CRITICAL | ✅ Done |
| 3 | Validate `llm_provider` against an allowlist | `llm_provider` is a free-form `str` — any admin can set it to an arbitrary value. Changed schema to `Literal["gemini", "anthropic", "openai", "deepseek", None]` in `schemas/influencer.py`. Prevents SSRF via env-var-controlled base URL injection. | 🔴 CRITICAL | ✅ Done |

## 7.2 — High

| # | Task | Description | Severity | Status |
|---|------|-------------|----------|--------|
| 1 | Add rate limiting to all `/studio` endpoints | None of the five studio routes have `@limiter.limit(...)`. Add `request: Request` param and apply `@limiter.limit("30/minute")` to stats, list, invite, role-change, and status-change routes in `routers/studio.py`. | 🟠 HIGH | ✅ Done |
| 2 | Remove `approved_by` email from response history | `GET /responses/history` is accessible to all users and returns `approved_by` (staff email). Restricted endpoint to `get_current_admin` in `routers/responses.py`. | 🟠 HIGH | ✅ Done |
| 3 | Upgrade Next.js to patch SSRF and DoS CVEs | `next@15.3.8` has multiple HIGH/CRITICAL CVEs including SSRF (`GHSA-4342-x723-ch2f`), HTTP request smuggling, and DoS via Server Components. Upgraded to `next@16.2.4`. | 🟠 HIGH | ✅ Done |
| 4 | Validate `hub_challenge` in webhook endpoint | `GET /webhooks/meta` reflects `hub.challenge` without length or character validation. Added `isdigit() + len > 20` check before reflecting in `routers/webhooks.py`. | 🟠 HIGH | ✅ Done |
| 5 | Restrict knowledge entry creation to admins | `POST /knowledge/` accepts any authenticated user and any `influencer_id` — any user can poison any influencer's RAG context. Changed dependency from `get_current_user` to `get_current_admin` in `routers/knowledge.py`. | 🟠 HIGH | ✅ Done |
| 6 | Replace `unsafe-eval` + `unsafe-inline` in CSP with nonces | `next.config.ts` CSP uses `'unsafe-eval'` and `'unsafe-inline'` for `script-src`, nullifying XSS protection. Moved CSP to `middleware.ts` with per-request nonce; removed both unsafe directives from `script-src`. | 🟠 HIGH | ✅ Done |

## 7.3 — Medium

| # | Task | Description | Severity | Status |
|---|------|-------------|----------|--------|
| 1 | Use `UUID` type for `user_id` path params in studio | `update_user_role` and `update_user_status` declare `user_id: str` — FastAPI skips UUID validation. Changed to `user_id: UUID` in `routers/studio.py`; equality checks updated to native UUID comparison. | 🟡 MEDIUM | ✅ Done |
| 2 | Add denylist cleanup cron job | `token_denylist` table grows unboundedly — no cleanup of expired entries. Added `denylist_cleanup_loop` in `core/denylist_cleanup.py` (runs every 1h); wired into `lifespan` in `main.py` alongside `token_renewal_loop`. | 🟡 MEDIUM | ✅ Done |
| 3 | Validate Fernet key format at startup | `utils/encryption.py` calls `Fernet(key)` without verifying the key is valid. Add a startup check in `lifespan`: attempt `Fernet(settings.token_encryption_key.encode())` and raise `RuntimeError` with a clear message on failure. | 🟡 MEDIUM | ✅ Done |
| 4 | Re-validate session role on each request | `auth.ts` caches `role` in the NextAuth JWT indefinitely (`!token.role` guard). Removed the `!token.role` condition — role is now re-fetched on every JWT rotation so demoted admins lose Studio access promptly. | 🟡 MEDIUM | ✅ Done |
| 5 | Sanitize OAuth error reflected as toast | `influencers/page.tsx:51` renders `oauthError` query param as toast text with no sanitization. Replaced the raw `\`Error: ${oauthError}\`` fallback with `"An unexpected error occurred. Please try again."` | 🟡 MEDIUM | ✅ Done |
| 6 | Add HSTS header to backend middleware | `SecurityHeadersMiddleware` in `main.py` is missing `Strict-Transport-Security`. Added `max-age=31536000; includeSubDomains` (skipped when `settings.debug` is true). | 🟡 MEDIUM | ✅ Done |

## 7.4 — Low

| # | Task | Description | Severity | Status |
|---|------|-------------|----------|--------|
| 1 | Raise password minimum length to 12 characters | `RegisterRequest` allows 8-character passwords. Update the `field_validator` in `schemas/auth.py:16` to require at least 12 characters. | 🟢 LOW | ✅ Done |
| 2 | Remove redundant `is_admin` field from User model | `User.is_admin` is never read or written by any router/dependency since the migration to `role`. Removes confusion risk. Drop the column via Alembic migration and remove from `UserOut`. | 🟢 LOW | ✅ Done |
| 3 | Require `META_OAUTH_STATE_SECRET` to be set explicitly | `_state_secret()` in `core/meta/oauth.py:115` falls back to `secret_key` if unset — same key signs JWTs and OAuth state. Remove the fallback; raise an error if `meta_oauth_state_secret` is empty in production. | 🟢 LOW | ✅ Done |
| 4 | Add rate limiting to OAuth callback endpoint | `GET /social-accounts/instagram/callback` has no rate limit. Add `@limiter.limit("10/minute")` and `request: Request` parameter in `routers/social_accounts.py:72`. | 🟢 LOW | ✅ Done |

---


---

[← Roadmap](README.md)
