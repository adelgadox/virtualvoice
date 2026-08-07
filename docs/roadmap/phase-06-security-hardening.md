# Phase 6 — Security Hardening ⬜

> Findings from a full security review (2026-04-20). Ordered by severity.
> Reference implementation: el repo `bioflow` — `sanitize.py`, `url_security.py`, `token_denylist.py`, `next.config.ts` headers.

## 6.1 — Critical

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Fix webhook signature verification | Exclude `/webhooks/meta` from `GZipMiddleware` so HMAC runs on raw bytes — currently ANY caller can POST spoofed webhooks | 🟡 | ✅ Done |
| 2 | Verify Google ID token server-side | `POST /auth/google` trusts unverified `google_id`/`email` from request body — anyone can impersonate any user. Replace with `id_token.verify_oauth2_token()` | 🟡 | ✅ Done |
| 3 | Bind OAuth callback to initiating session | Instagram callback is not tied to the user who started the flow. Embed `user_id` in state + add `get_current_user` dependency to the callback endpoint | 🟡 | ✅ Done |

## 6.2 — High

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Restrict user registration | `POST /auth/register` is fully public — any user can register and immediately approve/publish responses. Add admin-controlled allow-list or invite token | 🟢 | ✅ Done |

> **Re-enabling open registration (when needed):**
> The platform is currently invite-only. To re-open self-serve registration:
> 1. **Backend** — set `REGISTRATION_ENABLED=true` in Railway env vars (already implemented in `config.py`)
> 2. **Frontend middleware** — remove the `/register` redirect block in `frontend/src/middleware.ts` and add `"/register"` back to `PUBLIC_ROUTES`:
>    ```ts
>    // Remove this block:
>    if (pathname.startsWith("/register")) {
>      return NextResponse.redirect(new URL("/login", req.url));
>    }
>    // Restore:
>    const PUBLIC_ROUTES = ["/login", "/register"];
>    ```
> 3. **Login link** — restore the register link in `frontend/src/app/(auth)/login/page.tsx`:
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

## 6.3 — Medium

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Fix rate limiter IP extraction | `get_client_ip()` reads raw `X-Forwarded-For` — spoofable. Use `request.client.host` (already resolved by `ProxyHeadersMiddleware`) | 🟢 | ✅ Done |
| 2 | Encrypt Meta access tokens at rest | `social_accounts.access_token` is plaintext in DB. Use Fernet or KMS; decrypt only at point of use | 🔴 | ✅ Done |
| 3 | URL-encode OAuth error redirect param | `oauth_error` value reflected unencoded into redirect URL. Apply `urllib.parse.quote(error, safe='')` | 🟢 | ✅ Done |
| 4 | Add pagination to unbounded list endpoints | `GET /responses/pending`, `/knowledge/`, `/social-accounts/`, `/influencers/` have no `LIMIT` — add `.limit(200)` | 🟢 | ✅ Done |
| 5 | Add production debug guard | Add startup assertion: `DEBUG` must be `false` when `RAILWAY_ENVIRONMENT=production` | 🟢 | ✅ Done |
| 6 | Fix inconsistent API URL fallback | `frontend/src/app/(auth)/register/page.tsx` hardcodes `localhost:8001` while `lib/api.ts` uses `localhost:8000` | 🟢 | ✅ Done |
| 7 | Port input sanitization utilities from bioflow | Add `sanitize.py` (`strip_html`, `validate_slug`) and apply to influencer and knowledge entry schemas | 🟡 | ✅ Done |

## 6.4 — Low / Housekeeping

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Add secret leak detection pre-commit hook | Add `gitleaks` or `detect-secrets` to prevent accidental `.env` commits | 🟢 | ✅ Done |
| 2 | Remove unused `access_token` from `SocialAccountCreate` schema | Schema exposes a field with no route — remove or delete the schema entirely | 🟢 | ✅ Done |

---


---

[← Roadmap](README.md)
