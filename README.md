# 🤖 VirtualVoice — AI-Powered Virtual Influencer Response System

> Sistema backend + panel de aprobación para gestionar respuestas automatizadas de influencers virtuales en Instagram y Facebook, con generación de respuestas basada en IA y aprobación humana antes de publicar.

---

## Tabla de Contenidos

- [Visión General](#visión-general)
- [Arquitectura](#arquitectura)
- [Estructura del Repositorio](#estructura-del-repositorio)
- [Stack Tecnológico](#stack-tecnológico)
- [Módulos Principales](#módulos-principales)
  - [Personality Engine](#personality-engine)
  - [LLM Provider Pattern](#llm-provider-pattern)
  - [Knowledge Base & RAG](#knowledge-base--rag)
  - [Meta Integration](#meta-integration)
  - [Panel de Aprobación](#panel-de-aprobación)
- [Base de Datos](#base-de-datos)
- [Variables de Entorno](#variables-de-entorno)
- [Instalación y Desarrollo](#instalación-y-desarrollo)
- [Despliegue](#despliegue)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Roadmap](#roadmap)

---

## Visión General

**VirtualVoice** es un sistema que permite gestionar influencers virtuales en redes sociales (Instagram, Facebook, Threads) con respuestas generadas por IA que reflejan la personalidad única de cada influencer.

El flujo es siempre:

```
Comentario recibido → IA genera respuesta → Equipo aprueba → Se publica
```

Nunca se publica nada sin aprobación humana. Esto garantiza calidad, coherencia de marca y control total sobre lo que dice cada influencer virtual.

### Características clave

- 🧠 **Personality Engine** — cada influencer tiene su propia identidad, tono y knowledge base
- 🔄 **LLM agnóstico** — cambia entre Gemini, Claude, GPT-4o u otros sin tocar lógica de negocio
- ✅ **Human-in-the-loop** — toda respuesta pasa por aprobación antes de publicarse
- 📚 **RAG sobre personalidad** — el knowledge base de cada influencer se consulta dinámicamente con pgvector
- 🔁 **Feedback loop** — las respuestas aprobadas/editadas mejoran el modelo con el tiempo
- 👥 **Multi-influencer** — soporta múltiples influencers virtuales desde el mismo sistema

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     REDES SOCIALES                          │
│              Instagram · Facebook · Threads                 │
└────────────────────────┬────────────────────────────────────┘
                         │ Webhook (comentario nuevo)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI / Railway)                 │
│                                                             │
│  ┌──────────────┐    ┌─────────────────────────────────┐   │
│  │ Meta Webhook │───▶│        Personality Engine        │   │
│  │   Handler    │    │                                  │   │
│  └──────────────┘    │  1. System prompt base           │   │
│                      │  2. RAG → knowledge base         │   │
│  ┌──────────────┐    │  3. Historial de respuestas      │   │
│  │  Meta Graph  │    │  4. Contexto situacional         │   │
│  │     API      │    └────────────────┬────────────────┘   │
│  │  (publicar)  │                     │                     │
│  └──────┬───────┘                     ▼                     │
│         │              ┌──────────────────────────┐         │
│         │              │     LLM Provider Layer    │         │
│         │              │  Gemini · Claude · GPT-4o │         │
│         │              └────────────┬─────────────┘         │
│         │                           │                        │
│         │              ┌────────────▼─────────────┐         │
│         │              │   Respuesta generada      │         │
│         │              │   → guardada en DB        │         │
│         │              │   → estado: PENDING       │         │
│         │              └──────────────────────────┘         │
│         │                                                    │
│  ┌──────┴───────────────────────────────────────────────┐   │
│  │                   PostgreSQL + pgvector               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │ API REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND — Panel de Aprobación                  │
│                   (Next.js / Vercel)                         │
│                                                             │
│   Comentario original + Respuesta sugerida                  │
│   [✅ Aprobar]  [✏️ Editar]  [🔄 Regenerar]  [❌ Ignorar]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura del Repositorio

Monorepo con frontend y backend separados para despliegue independiente (Vercel + Railway), mismo patrón que Bioflow.

```
virtualvoice/
│
├── backend/                        # FastAPI — desplegado en Railway
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py               # Settings desde variables de entorno
│   │   │
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── webhooks.py     # Recibe eventos de Meta
│   │   │   │   ├── responses.py    # CRUD de respuestas pendientes
│   │   │   │   ├── influencers.py  # Gestión de influencers virtuales
│   │   │   │   └── knowledge.py    # Gestión del knowledge base
│   │   │   └── deps.py
│   │   │
│   │   ├── core/
│   │   │   ├── personality/
│   │   │   │   ├── engine.py       # Personality Engine principal
│   │   │   │   ├── prompt_builder.py
│   │   │   │   └── rag.py          # Consultas RAG sobre pgvector
│   │   │   │
│   │   │   ├── llm/
│   │   │   │   ├── base.py         # Interfaz abstracta LLMProvider
│   │   │   │   ├── gemini.py
│   │   │   │   ├── anthropic.py
│   │   │   │   ├── openai.py
│   │   │   │   └── factory.py      # Selecciona provider por config
│   │   │   │
│   │   │   └── meta/
│   │   │       ├── webhook_handler.py
│   │   │       ├── graph_api.py    # Publicar respuestas aprobadas
│   │   │       └── token_manager.py
│   │   │
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── influencer.py
│   │   │   ├── social_account.py
│   │   │   ├── comment.py
│   │   │   ├── pending_response.py
│   │   │   └── knowledge_entry.py
│   │   │
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── influencer.py
│   │   │   ├── response.py
│   │   │   └── knowledge.py
│   │   │
│   │   └── db/
│   │       ├── session.py
│   │       └── migrations/         # Alembic
│   │
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                       # Next.js — desplegado en Vercel
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Dashboard principal
│   │   │   ├── queue/              # Cola de respuestas pendientes
│   │   │   ├── influencers/        # Gestión de influencers
│   │   │   └── knowledge/          # Editor del knowledge base
│   │   │
│   │   ├── components/
│   │   │   ├── ApprovalCard.tsx    # Tarjeta comentario + respuesta
│   │   │   ├── InfluencerSelector.tsx
│   │   │   └── KnowledgeEditor.tsx
│   │   │
│   │   └── lib/
│   │       └── api.ts              # Cliente HTTP hacia el backend
│   │
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md                       # Este archivo
```

---

## Stack Tecnológico

### Backend
| Tecnología | Uso |
|---|---|
| **Python 3.12+** | Lenguaje principal |
| **FastAPI** | Framework API REST + webhooks |
| **PostgreSQL** | Base de datos principal |
| **pgvector** | Extensión para embeddings / RAG |
| **SQLAlchemy + Alembic** | ORM y migraciones |
| **Pydantic v2** | Validación de datos y schemas |

### Frontend
| Tecnología | Uso |
|---|---|
| **Next.js 14+** | Framework React (App Router) |
| **TypeScript** | Tipado estático |
| **Tailwind CSS** | Estilos |

### Integraciones externas
| Servicio | Uso |
|---|---|
| **Meta Graph API** | Leer comentarios y publicar respuestas |
| **Google Gemini API** | LLM principal (intercambiable) |
| **Anthropic API** | LLM alternativo |
| **OpenAI API** | LLM alternativo |

### Despliegue
| Servicio | Qué despliega |
|---|---|
| **Railway** | Backend FastAPI + PostgreSQL |
| **Vercel** | Frontend Next.js |

---

## Módulos Principales

### Personality Engine

El corazón del sistema. Construye el contexto completo para que el LLM responda como el influencer virtual específico.

La personalidad de cada influencer se estructura en tres capas:

**Capa 1 — System prompt core** _(raramente cambia)_
Define identidad fundamental: nombre, edad, ciudad, tono, idioma, frases características, temas prohibidos, forma de escribir, uso de emojis, etc.

**Capa 2 — Knowledge base vectorizado** _(se actualiza frecuentemente)_
Almacenado en PostgreSQL + pgvector. Contiene:
- Biografía detallada y backstory
- Opiniones sobre temas frecuentes de su nicho
- Relaciones con marcas, otros creadores, seguidores frecuentes
- Contexto de posts recientes
- Respuestas pasadas aprobadas (ejemplos de su voz real)
- Lista de "cosas que diría / jamás diría"

**Capa 3 — Contexto situacional** _(dinámico, por momento)_
- Qué publicó hoy y el contexto del post específico que recibió el comentario
- Mood actual (viaje, colaboración, descanso, lanzamiento)
- Tendencias relevantes para su nicho en ese momento

En cada llamada al LLM se combinan las tres capas:
```
prompt_final = system_prompt_core
             + fragmentos_relevantes_del_knowledge_base (RAG)
             + contexto_del_post_actual
             + comentario_del_usuario
```

---

### LLM Provider Pattern

Diseñado para cambiar de proveedor de LLM sin modificar lógica de negocio. Cada influencer puede incluso usar un LLM diferente.

```python
# Interfaz base — todos los providers la implementan
class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, system_prompt: str, user_message: str) -> str:
        ...

# Providers concretos
class GeminiProvider(LLMProvider): ...
class AnthropicProvider(LLMProvider): ...
class OpenAIProvider(LLMProvider): ...

# Factory — selecciona provider desde config
class LLMFactory:
    @staticmethod
    def get_provider(provider_name: str) -> LLMProvider:
        providers = {
            "gemini": GeminiProvider,
            "anthropic": AnthropicProvider,
            "openai": OpenAIProvider,
        }
        return providers[provider_name]()
```

El provider activo se configura por variable de entorno (`LLM_PROVIDER=gemini`) o a nivel de cada influencer en la base de datos.

---

### Knowledge Base & RAG

Se usa **pgvector** (extensión nativa de PostgreSQL) para no añadir infraestructura extra.

El flujo de consulta RAG en cada generación de respuesta:

1. El comentario entrante se convierte en embedding
2. Se buscan los `k` fragmentos más relevantes del knowledge base del influencer
3. Esos fragmentos se inyectan en el prompt junto al system prompt core
4. El LLM genera la respuesta con ese contexto enriquecido

**Tabla `knowledge_entries`**

| Campo | Descripción |
|---|---|
| `influencer_id` | A qué influencer pertenece |
| `category` | `biography`, `opinions`, `voice_examples`, `off_limits`, `brands`, etc. |
| `content` | El texto del fragmento |
| `embedding` | Vector generado (pgvector) |
| `updated_at` | Para saber qué está desactualizado |

El knowledge base se puede editar directamente desde el panel de administración del frontend, sin necesidad de tocar código.

**Feedback loop automático**: cada respuesta que el equipo aprueba (sin editar o con edits menores) se guarda automáticamente como un nuevo `voice_example` en el knowledge base, mejorando la calidad con el tiempo.

---

### Meta Integration

#### Recibir comentarios (Webhooks)

Meta envía un `POST` a tu endpoint cada vez que llega un comentario nuevo en las cuentas conectadas. El backend:

1. Verifica la firma del webhook (`X-Hub-Signature-256`)
2. Extrae el comentario, autor y referencia al post
3. Identifica a qué influencer virtual corresponde la cuenta
4. Dispara el Personality Engine para generar la respuesta
5. Guarda el comentario + respuesta generada en DB con estado `PENDING`
6. Notifica al panel de aprobación (polling o WebSocket)

#### Publicar respuesta aprobada

Cuando el equipo aprueba una respuesta desde el panel, el backend llama a:

```
POST /{comment-id}/replies
Authorization: Bearer {page_access_token}
Body: { "message": "respuesta aprobada" }
```

#### Requisitos de Meta
- Cuenta de Instagram tipo **Business** o **Creator**
- Vinculada a una **Facebook Page**
- **Meta Business Suite** configurado
- App de Meta con permisos: `instagram_basic`, `instagram_manage_comments`, `pages_manage_engagement`
- Endpoint HTTPS público para recibir webhooks (Railway lo provee automáticamente)
- Page Access Token de larga duración (válido 60 días, con renovación automática implementada)

---

### Panel de Aprobación

Interfaz interna en Next.js donde el equipo gestiona la cola de respuestas pendientes.

#### Vista principal — Cola de aprobación

```
┌─────────────────────────────────────────────────────────┐
│  💬 @usuario_real  •  Post: "Outfit del día 🌸"  •  5m  │
│  "omg me encanta!! donde compraste esa chamarra??"      │
├─────────────────────────────────────────────────────────┤
│  🤖 Respuesta sugerida  •  Gemini 2.5  •  Layla AI      │
│  "jajaja gracias!! la encontré en un vintage de la      │
│   Roma, ya sabes que no puedo resistir un thrift 🤌"    │
├─────────────────────────────────────────────────────────┤
│  [✅ Aprobar]  [✏️ Editar]  [🔄 Regenerar]  [❌ Ignorar] │
└─────────────────────────────────────────────────────────┘
```

#### Funcionalidades del panel

- **Cola en tiempo real** — muestra comentarios pendientes ordenados por antigüedad
- **Filtro por influencer** — si hay múltiples influencers, filtra la cola por cuenta
- **Edición inline** — edita la respuesta sugerida directamente antes de aprobar
- **Regenerar** — pide una nueva respuesta al LLM sin perder el comentario original
- **Historial** — log de todas las respuestas publicadas, editadas e ignoradas
- **Editor de knowledge base** — sección para actualizar la personalidad de cada influencer sin código
- **Métricas básicas** — tasa de aprobación directa vs. con edición (indica calidad del prompt)

---

## Base de Datos

### Tablas principales

**`influencers`**
```
id, name, slug, llm_provider, system_prompt_core, 
is_active, created_at, updated_at
```

**`social_accounts`**
```
id, influencer_id, platform (instagram|facebook|threads),
account_id, page_id, access_token, token_expires_at
```

**`comments`**
```
id, social_account_id, platform_comment_id, author_username,
author_platform_id, content, post_id, post_content,
received_at, processed
```

**`pending_responses`**
```
id, comment_id, influencer_id, suggested_text,
final_text, llm_provider_used, status (pending|approved|edited|rejected|ignored),
approved_by, approved_at, published_at, platform_reply_id
```

**`knowledge_entries`**
```
id, influencer_id, category, content, embedding (vector),
is_active, created_at, updated_at
```

**`knowledge_categories`** (enum de referencia)
```
biography, opinions, voice_examples, off_limits,
brand_relationships, situational_context
```

---

## Variables de Entorno

### Backend (`backend/.env`)

```env
# Base de datos
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/virtualvoice

# LLM Providers
LLM_PROVIDER=gemini                          # Provider por defecto
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# Meta / Facebook Graph API
META_APP_ID=...
META_APP_SECRET=...
META_WEBHOOK_VERIFY_TOKEN=...                # Token para verificar webhooks

# Seguridad
SECRET_KEY=...                               # JWT signing key
ALLOWED_ORIGINS=https://tu-panel.vercel.app

# App
ENVIRONMENT=production
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://tu-panel.vercel.app
```

---

## Instalación y Desarrollo

### Requisitos previos

- Python 3.12+
- Node.js 18+
- PostgreSQL 15+ con extensión `pgvector`
- Cuenta de Meta Developer con app configurada

### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# edita .env con tus credenciales

# Activar pgvector en PostgreSQL
# psql -d virtualvoice -c "CREATE EXTENSION vector;"

# Ejecutar migraciones
alembic upgrade head

# Levantar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# edita .env.local

# Levantar servidor de desarrollo
npm run dev
```

La API queda disponible en `http://localhost:8000` y el panel en `http://localhost:3000`.

---

## Despliegue

Mismo esquema que Bioflow: **monorepo con despliegue independiente por servicio**.

### Backend → Railway

1. Conecta el repositorio a Railway
2. Configura el **Root Directory** como `backend/`
3. Railway detecta automáticamente el `Dockerfile` o usa Nixpacks con Python
4. Agrega las variables de entorno desde la sección anterior
5. Provisiona una base de datos PostgreSQL desde Railway y activa la extensión `pgvector`:
   ```sql
   CREATE EXTENSION vector;
   ```
6. El dominio público de Railway será tu endpoint de webhooks para Meta

### Frontend → Vercel

1. Conecta el repositorio a Vercel
2. Configura el **Root Directory** como `frontend/`
3. Framework preset: **Next.js**
4. Agrega las variables de entorno (`NEXT_PUBLIC_API_URL` apuntando a Railway)
5. Deploy automático en cada push a `main`

### Configurar Webhooks en Meta

1. Ve a [Meta for Developers](https://developers.facebook.com) → tu App → Webhooks
2. Suscribe al evento `instagram_comments` y `feed` (Facebook)
3. URL del webhook: `https://tu-backend.railway.app/api/webhooks/meta`
4. Verify token: el mismo que configuraste en `META_WEBHOOK_VERIFY_TOKEN`

---

## Flujo de Trabajo

```
1. Usuario deja comentario en post del influencer virtual
        │
        ▼
2. Meta envía webhook al backend
        │
        ▼
3. Personality Engine construye el prompt:
   system_prompt_core + RAG(knowledge_base) + contexto_post + comentario
        │
        ▼
4. LLM genera respuesta en la voz del influencer
        │
        ▼
5. Comentario + respuesta guardados en DB (estado: PENDING)
        │
        ▼
6. Panel de aprobación muestra la tarjeta al equipo
        │
        ├── [Aprobar] → se publica inmediatamente en Meta
        │               → respuesta guardada como voice_example
        │
        ├── [Editar]  → equipo modifica el texto → publica
        │               → edición registrada para análisis de calidad
        │
        ├── [Regenerar] → nueva llamada al LLM con mismo contexto
        │
        └── [Ignorar] → se archiva sin publicar
```

---

## Roadmap

### v1 — MVP
- [ ] Webhook Meta (Instagram + Facebook)
- [ ] Personality Engine básico (system prompt + knowledge base estático)
- [ ] LLM provider pattern con Gemini como default
- [ ] Panel de aprobación — cola + aprobar/editar/ignorar
- [ ] Publicar respuesta aprobada vía Meta Graph API
- [ ] Soporte para un influencer virtual

### v2 — Multiinfluencer + RAG
- [ ] Soporte para múltiples influencers
- [ ] pgvector + RAG sobre knowledge base
- [ ] Editor de knowledge base en el panel
- [ ] Feedback loop: respuestas aprobadas → voice examples automáticos
- [ ] Soporte Anthropic y OpenAI como providers alternativos

### v3 — Inteligencia y escala
- [ ] Contexto situacional dinámico (mood, posts recientes)
- [ ] Métricas de calidad (tasa de edición, tasa de rechazo por influencer)
- [ ] Soporte Threads (cuando Meta abra la API de comentarios)
- [ ] Notificaciones al equipo (Slack / email) cuando hay comentarios pendientes
- [ ] Renovación automática de tokens de Meta

---

## Notas de Diseño

- **Nunca auto-publicar**: toda respuesta pasa por aprobación humana. No existe camino hacia publicación sin intervención del equipo.
- **LLM agnóstico desde día 1**: aunque se empiece con Gemini, el provider pattern permite cambiar sin refactoring.
- **pgvector sobre servicios externos**: usar la extensión de PostgreSQL existente evita introducir Pinecone u otras dependencias de pago para el vector store, al menos en las etapas iniciales.
- **Monorepo, despliegue independiente**: `backend/` y `frontend/` son proyectos autónomos que comparten repositorio pero tienen sus propios `package.json` / `requirements.txt`, variables de entorno y pipelines de despliegue. El mismo patrón probado en Bioflow.

---

*Proyecto privado — todos los derechos reservados.*
