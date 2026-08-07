# Phase 4.6 — Creator Monetization Platforms ⬜

> Virtual influencers are highly relevant for creator economy platforms (OnlyFans, Fansly, etc.).
> API landscape is fragmented: some platforms have official APIs, most are walled gardens.
> Strategy: start with Fanvue (official API), then evaluate middleware options for OnlyFans/Fansly, then Telegram as a bonus channel.

## API Availability Summary (researched 2026-05)

| Platform | Official API | DMs | Comments | Notes |
|----------|-------------|-----|----------|-------|
| **Fanvue** | ✅ Yes (v2025-06-26) | ✅ Yes | ✅ Yes | OAuth2, LLM-friendly, n8n integration |
| **OnlyFans** | ❌ No | Via middleware | Via middleware | Unofficial APIs exist (TheOnlyAPI, oFANS). Supercreator is a compliant middleware (~25k users). OnlyFans 2026 rules require AI disclosure. |
| **Fansly** | ❌ No | Via middleware | Via middleware | Third-party APIs (ApiFansly) claim zero-ban track record. Similar risk profile to OnlyFans. |
| **MYM.fans** | ❌ No | ❌ Scraping only | ❌ Scraping only | No viable integration path. Skip. |
| **Patreon** | ✅ Yes | ❌ No DM API | Limited | Patreon API lacks DM endpoints (frequently requested, not shipped). Not useful for this use case. |
| **Telegram** | ✅ Yes (Bot API v9.6) | ✅ Yes | ✅ Yes | Production-ready. High-volume automation supported natively. |

## 4.6.1 — Fanvue (Priority 1 — Official API)

> Fanvue has a production-ready REST API with OAuth2. Closest to a "clean" integration: same architecture as Meta.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Fanvue OAuth2 + account connection | OAuth2 flow to connect a Fanvue creator account. Store access token (encrypted, same pattern as Meta). | 🟡 | ⬜ Pending |
| 2 | Fanvue DM polling | Fanvue uses polling (no webhook push). Poll `GET /messages` every N minutes for new fan messages. Add `fanvue_poller.py` background task. | 🟡 | ⬜ Pending |
| 3 | Fanvue comment polling | Poll `GET /posts/{id}/comments` for new comments on creator posts. | 🟡 | ⬜ Pending |
| 4 | Fanvue reply — DMs | `POST /messages/{thread_id}/reply` with approved text. | 🟡 | ⬜ Pending |
| 5 | Fanvue reply — comments | `POST /posts/{post_id}/comments/{id}/reply` with approved text. | 🟢 | ⬜ Pending |
| 6 | Conversation context on Fanvue DMs | Reuse `Conversation` model from 4.5.DM. Fanvue threads map directly to the same sliding window + lazy summary strategy. | 🟢 | ⬜ Pending |

## 4.6.2 — OnlyFans / Fansly via Middleware (Priority 2 — Requires Evaluation)

> No official API exists. Two paths: (A) direct unofficial API, (B) Supercreator partnership.
> Decision needed before implementation: legal/ToS risk appetite.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Evaluate middleware options | Compare TheOnlyAPI vs. oFANS vs. Supercreator: pricing, reliability, ToS stance, ban risk, AI disclosure requirements. Document decision. | 🟡 | ⬜ Pending |
| 2 | OnlyFans adapter (if middleware approved) | Wrap chosen middleware as a `PlatformAdapter`. Poll for new DMs/messages. Same internal flow: message in → Personality Engine → PENDING → approve → send via middleware. | 🔴 | ⬜ Pending |
| 3 | Fansly adapter (if middleware approved) | Same as OnlyFans adapter; Fansly uses ApiFansly or similar. | 🔴 | ⬜ Pending |
| 4 | AI disclosure compliance | OnlyFans 2026 rules require disclosing AI involvement in fan chats. Add per-influencer `ai_disclosure_enabled` flag; prepend disclosure text to first message of each new conversation. | 🟡 | ⬜ Pending |

## 4.6.3 — Telegram (Priority 3 — Bonus Channel)

> Telegram Bot API v9.6 is mature, production-ready, and has zero ToS concerns for automation.
> Virtual influencers can have a Telegram channel + bot for direct fan interaction.

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Telegram bot setup | Create bot via BotFather, connect to influencer. Store bot token (encrypted). | 🟢 | ⬜ Pending |
| 2 | Telegram webhook (getUpdates) | Register webhook URL (`setWebhook`). Parse `message` and `channel_post` update types. | 🟡 | ⬜ Pending |
| 3 | Telegram DM reply | `sendMessage` with `chat_id` of fan. No messaging window restriction (unlike Meta). | 🟢 | ⬜ Pending |
| 4 | Telegram channel comments | Bot can reply to comments on channel posts if bot is admin of the channel. | 🟡 | ⬜ Pending |
| 5 | Conversation context | Same `Conversation` model + sliding window strategy from 4.5.DM applies. | 🟢 | ⬜ Pending |


---

[← Roadmap](README.md)
