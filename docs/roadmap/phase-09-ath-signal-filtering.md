# Phase 9 — ATH Signal & Filtering ⬜

> Improve what enters the human queue: reduce noise, capture human signals, and surface useful feedback loops.
> Based on ATH paradigm audit conducted 2026-05-07.

## 9.1 — Pre-generation Comment Filter

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Spam/bot detection before LLM call | Classify incoming comments as `spam`, `bot`, `trivial`, or `actionable` before generating a response. Use heuristics (emoji-only, follow-for-follow patterns, length < 3 words) + optional lightweight LLM classifier. Skip LLM generation and mark as `ignored` automatically for non-actionable comments. | 🟡 | ⬜ Pending |
| 2 | Configurable filter thresholds per influencer | Allow admins to set per-influencer sensitivity for the spam filter (strict / balanced / permissive). Store as `spam_filter_level` on `Influencer` model. | 🟢 | ⬜ Pending |
| 3 | Filter audit log | Record all auto-ignored comments with the reason (`spam_filter`, `bot_detected`, etc.) so admins can review false positives. New `FilteredComment` model or `filter_reason` column on `Comment`. | 🟢 | ⬜ Pending |
| 4 | Frontend — filter stats on metrics page | Show count of auto-filtered vs. human-reviewed comments per influencer per week. | 🟢 | ⬜ Pending |

## 9.2 — Human Signal Capture

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Ignore with reason | Add optional `reason` field to `POST /responses/{id}/ignore`. Enum: `spam`, `off_topic`, `wrong_tone`, `sensitive`, `duplicate`, `other`. Store in `PendingResponse.ignore_reason`. | 🟢 | ⬜ Pending |
| 2 | Reason selector in ApprovalCard UI | After clicking Ignore, show a reason picker (chip group or dropdown) before confirming. Reason is optional but nudged. | 🟢 | ⬜ Pending |
| 3 | Ignore reason analytics | Surface ignore reasons in `GET /metrics/` per influencer so operators can identify systematic generation failures (e.g. "40% ignored for wrong_tone" → prompt needs tuning). | 🟡 | ⬜ Pending |

## 9.3 — Response Versioning

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Persist all generation attempts | Each `POST /responses/{id}/regenerate` currently overwrites `suggested_text`. Instead, store each attempt as a row in a new `response_versions` table with `version_number`, `suggested_text`, `generated_at`. Keep latest as the active version. | 🟡 | ⬜ Pending |
| 2 | Version history in ApprovalCard | Show "Version 2 of 3 — ← →" navigation in ApprovalCard so human can compare attempts and pick the best one before approving. | 🟡 | ⬜ Pending |
| 3 | Approve specific version | `POST /responses/{id}/approve` accepts optional `version_id` param to publish a non-latest version. | 🟢 | ⬜ Pending |

## 9.4 — Knowledge Base Audit

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Tag auto-saved voice examples | `voice_examples` saved automatically from approved responses get `source: auto_approved` tag. Currently all entries look the same. Add `source` field to `KnowledgeEntry` (`manual` / `auto_approved` / `auto_edited`). | 🟢 | ⬜ Pending |
| 2 | Auto-saved entries review page | New section in `/dashboard/knowledge`: "Pending Review" tab showing auto-saved entries not yet manually confirmed. Admins can confirm (promote to `manual`) or delete. | 🟡 | ⬜ Pending |
| 3 | Duplicate detection before saving | Before saving an approved response as a voice example, run cosine similarity against existing entries. If similarity > 0.92, skip insert to prevent redundant RAG context. | 🟡 | ⬜ Pending |

## 9.5 — Token Expiry Alerts

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Detect failed token renewal | In `token_renewal_loop`, catch refresh failures and write a `renewal_failed_at` timestamp + `renewal_error` field to `SocialAccount`. Currently failures are silently swallowed. | 🟢 | ⬜ Pending |
| 2 | Surface re-auth banner in UI | If `renewal_failed_at` is set on any social account, show a persistent warning banner in the dashboard header: "Instagram account [name] needs re-authentication." Link to the OAuth reconnect flow. | 🟡 | ⬜ Pending |
| 3 | Email alert on renewal failure | Send an email to the account owner when Meta token renewal fails (using `SMTP_*` env vars or a transactional provider). Prevents silent loss of webhook publishing capability. | 🟡 | ⬜ Pending |


---

[← Roadmap](README.md)
