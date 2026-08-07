# Phase 5.5 — Voice Layer (ElevenLabs) ⬜

> Give each influencer a unique, cloneable voice. Text responses become audio responses.
> All tasks in this phase require an ElevenLabs API key (`ELEVENLABS_API_KEY`).

## Infrastructure notes

| Concern | Decision | Why |
|---------|----------|-----|
| Audio storage | **Cloudflare R2** (recommended) or Supabase Storage | Railway has no blob storage. R2 = $0.015/GB, zero egress fees, S3-compatible API. Supabase Storage = free up to 1 GB, simpler if already using Supabase. |
| Backend changes | Deploy on Railway (same service) | Only new env vars needed: `ELEVENLABS_API_KEY`, `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` |
| Audio generation | On-demand + cache (Option B) | Generate once on response creation, store URL in DB. Re-requests serve the cached URL — zero repeat API cost. |
| ElevenLabs TTS endpoint | `POST /v1/text-to-speech/{voice_id}` | Returns MP3 bytes. Pass `model_id=eleven_turbo_v2_5` for lowest latency. |
| Cache key | `SHA256(text + voice_id + stability + similarity)` | Same text + same settings = same audio. Avoids duplicates. |

---

## 5.5.1 — Foundation (Backend)

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

## 5.5.2 — Generate Voices UI (`/dashboard/voices`)

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

## 5.5.3 — Approval Queue Integration

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Auto-generate audio on response creation | After LLM generates response text, trigger `VoiceService.generate_and_cache` as background task if influencer has `voice_id` | 🟡 | ⬜ Pending |
| 2 | Audio preview in ApprovalCard | Add "▶ Preview" button; plays `audio_url` if ready, shows spinner + "Generating…" while pending | 🟢 | ⬜ Pending |
| 3 | Audio DM publishing | On approve: if `audio_url` exists, send voice message DM via Instagram API alongside text reply | 🔴 | ⬜ Pending |

## 5.5.4 — Content Generation

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Script-to-audio export | Given a script (manual or LLM-generated), produce downloadable MP3 for Reels / Stories narration | 🟡 | ⬜ Pending |
| 2 | Weekly audio snippet (cron) | LLM generates a short monologue based on `current_context`, ElevenLabs converts to audio, stored in R2, available for download | 🔴 | ⬜ Pending |

## 5.5.5 — Conversational Voice (Advanced)

| # | Task | Description | Complexity | Status |
|---|------|-------------|------------|--------|
| 1 | Real-time voice WebSocket | ElevenLabs Conversational AI endpoint with `system_prompt_core` + knowledge base as context; low-latency back-and-forth | 🔴 | ⬜ Pending |
| 2 | Phone hotline via Twilio | Twilio TwiML → ElevenLabs Conversational AI → fans call a real number and talk to the influencer | 🔴 | ⬜ Pending |


---

[← Roadmap](README.md)
