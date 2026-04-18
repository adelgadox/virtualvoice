# 🤖 VirtualVoice — AI-Powered Virtual Influencer Response System

> Backend system + approval panel to manage automated responses from virtual influencers on Instagram and Facebook, with AI-generated replies and human approval before publishing.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Core Modules](#core-modules)
  - [Personality Engine](#personality-engine)
  - [LLM Provider Pattern](#llm-provider-pattern)
  - [Knowledge Base & RAG](#knowledge-base--rag)
  - [Meta Integration](#meta-integration)
  - [Approval Panel](#approval-panel)
- [Database](#database)
- [Environment Variables](#environment-variables)
- [Installation & Development](#installation--development)
- [Deployment](#deployment)
- [Workflow](#workflow)
- [Roadmap](#roadmap)

---

## Overview

**VirtualVoice** is a system designed to manage virtual influencers on social media (Instagram, Facebook, Threads), generating AI-powered responses that reflect each influencer’s unique personality.

The flow is always:

```
Comment received → AI generates response → Team approves → Published
```

Nothing is ever published without human approval. This ensures quality, brand consistency, and full control over what each virtual influencer says.

### Key Features

- 🧠 **Personality Engine** — each influencer has a unique identity, tone, and knowledge base  
- 🔄 **LLM-agnostic** — switch between Gemini, Claude, GPT-4o, or others without touching business logic  
- ✅ **Human-in-the-loop** — every response is approved before publishing  
- 📚 **Personality-based RAG** — each influencer’s knowledge base is dynamically queried using pgvector  
- 🔁 **Feedback loop** — approved/edited responses improve the system over time  
- 👥 **Multi-influencer** — supports multiple virtual influencers in a single system  

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SOCIAL NETWORKS                         │
│              Instagram · Facebook · Threads                 │
└────────────────────────┬────────────────────────────────────┘
                         │ Webhook (new comment)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI / Railway)                │
│                                                             │
│  ┌──────────────┐    ┌─────────────────────────────────┐   │
│  │ Meta Webhook │───▶│        Personality Engine        │   │
│  │   Handler    │    │                                  │   │
│  └──────────────┘    │  1. Base system prompt           │   │
│                      │  2. RAG → knowledge base         │   │
│  ┌──────────────┐    │  3. Response history             │   │
│  │  Meta Graph  │    │  4. Situational context          │   │
│  │     API      │    └────────────────┬────────────────┘   │
│  │  (publish)   │                     │                     │
│  └──────┬───────┘                     ▼                     │
│         │              ┌──────────────────────────┐         │
│         │              │     LLM Provider Layer    │         │
│         │              │  Gemini · Claude · GPT-4o │         │
│         │              └────────────┬─────────────┘         │
│         │                           │                        │
│         │              ┌────────────▼─────────────┐         │
│         │              │   Generated response      │         │
│         │              │   → stored in DB          │         │
│         │              │   → status: PENDING       │         │
│         │              └──────────────────────────┘         │
│         │                                                    │
│  ┌──────┴───────────────────────────────────────────────┐   │
│  │                   PostgreSQL + pgvector               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND — Approval Panel                      │
│                   (Next.js / Vercel)                        │
│                                                             │
│   Original comment + Suggested response                    │
│   [✅ Approve]  [✏️ Edit]  [🔄 Regenerate]  [❌ Ignore]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

Monorepo with separated frontend and backend for independent deployment (Vercel + Railway).

```
virtualvoice/
...
```

---

## Tech Stack

### Backend
| Technology | Usage |
|---|---|
| Python 3.12+ | Main language |
| FastAPI | REST API + webhooks |
| PostgreSQL | Database |
| pgvector | RAG |
| SQLAlchemy + Alembic | ORM |
| Pydantic v2 | Validation |

### Frontend
| Technology | Usage |
|---|---|
| Next.js | React framework |
| TypeScript | Typing |
| Tailwind CSS | Styling |

---

*Private project — all rights reserved.*
