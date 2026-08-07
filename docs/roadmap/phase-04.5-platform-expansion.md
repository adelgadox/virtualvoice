# Phase 4.5 — Platform Expansion ⬜

> Each platform is a new adapter under `core/platforms/`. No changes to the Personality Engine.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Slack notifications | Alert team on new pending comments | 🟡 | ⬜ Pending |
| 2 | Threads support | Extend Meta integration to Threads (pending Meta API availability) | 🔴 | ⬜ Pending |
| 3 | Twitter/X — read mentions | Read mentions and replies via Twitter API v2 | 🔴 | ⬜ Pending |
| 4 | Twitter/X — publish response | Publish approved reply via Twitter API v2 | 🔴 | ⬜ Pending |
| 5 | TikTok — read comments | Read comments via TikTok Research API (read-only; no official reply endpoint as of 2026) | 🔴 | ⬜ Pending |
| 6 | TikTok — publish response | **Blocked** — TikTok has no public API for posting comment replies. Requires official partner access. Revisit when API is opened. | 🔴 | ⬜ Blocked |
| 7 | TikTok — DMs | **Not feasible** — TikTok DM API is closed beta, partner-only, restricted to select regions. No public API. | 🔴 | ⬜ Blocked |
| 8 | Creator platforms (OnlyFans et al.) | See Phase 4.6 for full breakdown | 🔴 | ⬜ Pending |
| 9 | Frontend — platform selector | Filter approval queue by platform (comments vs. DMs vs. platform) | 🟢 | ⬜ Pending |

## 4.5.DM — Direct Message Support (Instagram & Facebook)

> Meta Messaging API is production-ready. DMs follow the same webhook → LLM → PENDING → approve → publish flow as comments.
> New webhook event type: `messages` (vs. `comments`). Same Personality Engine, same approval panel — just a new source type.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Instagram DMs — webhook subscription | Subscribe to `messages` field in Meta webhook config. Add `instagram_manage_messages` permission to the Meta app. | 🟡 | ⬜ Pending |
| 2 | Facebook Messenger — webhook subscription | Subscribe to `messages`, `message_reads`, `message_deliveries` fields. Same Meta app, Page-level permission. | 🟡 | ⬜ Pending |
| 3 | DM webhook handler | Extend `webhook_handler.py` to parse `messages` payloads (sender PSID, message text, attachments). Create `DirectMessage` model or reuse `Comment` with `source_type=dm`. | 🟡 | ⬜ Pending |
| 4 | DM reply via Send API | `POST /me/messages` with `recipient: { id: sender_psid }` + `message: { text: approved_response }`. Separate from comment replies (`POST /{comment-id}/replies`). | 🟡 | ⬜ Pending |
| 5 | 24-hour messaging window enforcement | Meta DMs can only be replied to within 24h of last user message. Add `expires_at` field to DM records; show warning badge in ApprovalCard when < 2h remain. | 🟡 | ⬜ Pending |
| 6 | Conversation context — sliding window | DMs are threaded conversations. Inject last 8 messages from the thread into the Personality Engine prompt (configurable via `dm_context_window` per influencer). 8 msgs ≈ 600-800 extra tokens — predictable cost. | 🟡 | ⬜ Pending |
| 7 | Conversation context — lazy summary | For long threads (> 12 messages in a session): generate a 2-3 line summary of older messages via Haiku after each approved reply, store in `Conversation.summary`. Inject summary + last 4 msgs instead of full history. Prevents token growth on active fans without losing context. | 🔴 | ⬜ Pending |
| 8 | `Conversation` model | New DB table: `id`, `platform`, `platform_thread_id`, `influencer_id`, `fan_external_id`, `summary TEXT`, `last_message_at`, `session_expires_at`. Groups `DirectMessage` rows per thread. | 🟡 | ⬜ Pending |
| 9 | ApprovalCard — DM indicator | Show DM badge vs. comment badge in the queue. DMs with < 2h before window expiry show urgent badge. | 🟢 | ⬜ Pending |


---

[← Roadmap](README.md)
