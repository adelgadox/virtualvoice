# Phase 10 — ATH Intelligence ⬜

> Reduce human workload through smarter routing, batch operations, and confidence-aware prioritization.
> These tasks build on Phase 9 signals and add higher-complexity automation.

## 10.1 — LLM Confidence Scoring

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Add confidence field to `PendingResponse` | New `confidence_score FLOAT` column (0.0–1.0) and `confidence_flags JSONB` (e.g. `{"topic_mismatch": true, "low_rag_coverage": true}`) on `pending_responses`. | 🟢 | ⬜ Pending |
| 2 | Compute confidence proxy in Personality Engine | After generation: (a) RAG coverage score — average similarity of top-k fragments; (b) topic overlap — embeddings distance between comment and response; (c) response length reasonableness. Combine into a 0–1 heuristic score stored on the response. | 🔴 | ⬜ Pending |
| 3 | Confidence badge in ApprovalCard | Show a colored confidence pill (🟢 High / 🟡 Medium / 🔴 Low) on each card. Low-confidence cards are visually prominent and sorted to the top of the queue. | 🟡 | ⬜ Pending |
| 4 | Low-confidence auto-flag for review | Responses below a configurable threshold (e.g. `< 0.4`) get an `attention_required: true` flag and are pinned to the top of the queue without being auto-approved. | 🟢 | ⬜ Pending |

## 10.2 — Escalation Rules Engine

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `EscalationRule` model | New table: `id`, `influencer_id`, `trigger_keywords TEXT[]`, `trigger_topics TEXT[]`, `action ENUM(pin_top, notify_admin, block_publish)`, `created_by`, `is_active`. | 🟡 | ⬜ Pending |
| 2 | Rule evaluation in webhook handler | After saving `PendingResponse`, evaluate active escalation rules for the influencer. On match: set `escalated: true`, `escalation_rule_id`, and apply the configured action. | 🔴 | ⬜ Pending |
| 3 | Escalation rules CRUD API | `GET/POST/PATCH/DELETE /influencers/{id}/escalation-rules` — admin-only endpoints to manage rules per influencer. | 🟡 | ⬜ Pending |
| 4 | Escalation rules UI | Section in influencer settings to define keyword triggers and choose action (pin / notify / block). | 🟡 | ⬜ Pending |
| 5 | Escalated card visual treatment | Escalated responses show a 🔴 badge, are sorted before non-escalated, and display which rule matched. | 🟢 | ⬜ Pending |

## 10.3 — Batch Approval

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Semantic similarity grouping | New backend job: after generation, compute pairwise similarity among pending responses for the same influencer. Group responses with similarity > 0.85 into a `batch_group_id`. | 🟡 | ⬜ Pending |
| 2 | Batch approve endpoint | `POST /responses/batch-approve` — accepts `{ ids: UUID[], final_text?: str }`. Approves all, optionally overriding text on all. Respects token validation per social account. | 🟡 | ⬜ Pending |
| 3 | Batch ignore endpoint | `POST /responses/batch-ignore` — accepts `{ ids: UUID[], reason?: str }`. Ignores all with optional shared reason. | 🟢 | ⬜ Pending |
| 4 | Grouped cards in queue UI | When a batch group has > 1 pending response, collapse them into a "group card" showing one representative response + "N similar". Expand to see all; single approve button publishes all in the group. | 🔴 | ⬜ Pending |

## 10.4 — Auto-Approval Rules

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | `AutoApprovalRule` model | New table: `influencer_id`, `condition ENUM(high_confidence, short_response, exact_match_template)`, `threshold FLOAT`, `is_active`, `created_by`. | 🟡 | ⬜ Pending |
| 2 | Rule evaluation after generation | If all active rules for the influencer match (e.g. confidence > 0.85 AND response length < 80 chars), auto-approve and publish without human step. Record `auto_approved: true` on `PendingResponse`. | 🔴 | ⬜ Pending |
| 3 | Auto-approval audit trail | `GET /responses/auto-approved` — paginated list of auto-approved responses for admin review. Allow retroactive ignore/flag. | 🟡 | ⬜ Pending |
| 4 | Auto-approval rules UI | Section in influencer settings. Admins toggle conditions, set thresholds. Show last 7-day auto-approval rate as a preview of impact. | 🟡 | ⬜ Pending |
| 5 | Kill switch — disable all auto-approval | Global `AUTO_APPROVAL_ENABLED` env var (default `false`). If `false`, rule evaluation is skipped entirely regardless of per-influencer config. | 🟢 | ⬜ Pending |

## 10.5 — Real-time Queue Updates

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Replace polling with SSE | `/responses/stream` — `text/event-stream` endpoint that pushes `new_pending`, `response_approved`, `response_ignored` events. Eliminates 30s polling latency and unnecessary API calls. | 🟡 | ⬜ Pending |
| 2 | Frontend SSE hook | `useQueueStream()` React hook replaces the current `setInterval` polling in `/dashboard/queue`. Auto-reconnects on disconnect. | 🟡 | ⬜ Pending |
| 3 | In-app toast on new pending | When a new comment arrives while the operator has the queue open, show a toast: "New comment from @username on [influencer]" with a link to the card. | 🟢 | ⬜ Pending |

---

*Last updated: 2026-05-17 (Phase 8.2 HIGH + 8.4 LOW complete · Phase 4.5 DM + 4.6 creator platforms documented)*

---

[← Roadmap](README.md)
