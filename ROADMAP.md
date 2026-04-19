# ROADMAP — VirtualVoice

Estado actual del proyecto y fases de desarrollo.

**Leyenda:** ✅ Completo · 🔧 En progreso · ⬜ Pendiente

---

## Fase 0 — Infraestructura base
> Setup inicial del proyecto, estructura de carpetas y configuración de entorno.

| Tarea | Estado | Notas |
|-------|--------|-------|
| Estructura monorepo `backend/` + `frontend/` | ✅ | |
| `Dockerfile` backend | ✅ | Multi-stage, Python 3.12-slim |
| `docker-compose.yml` local | ✅ | Postgres en puerto 5433 |
| `requirements.txt` | ✅ | FastAPI, SQLAlchemy, Alembic, pgvector, etc. |
| Variables de entorno (`.env.example`) | ✅ | |
| Configuración con Pydantic Settings (`config.py`) | ✅ | |
| Setup Alembic + primera migración | ✅ | Tablas creadas en DB local |
| `main.py` con CORS, rate limit y routers registrados | ✅ | |

---

## Fase 1 — Backend Core (MVP)
> Funcionalidad mínima viable: recibir comentarios, generar respuesta, aprobar y publicar.

### 1.1 Modelos y esquemas

| Tarea | Estado | Notas |
|-------|--------|-------|
| Modelo `User` | ✅ | |
| Modelo `Influencer` | ✅ | |
| Modelo `SocialAccount` | ✅ | |
| Modelo `Comment` | ✅ | |
| Modelo `PendingResponse` | ✅ | |
| Modelo `KnowledgeEntry` | ✅ | |
| Schemas Pydantic (influencer, response, knowledge, auth) | ✅ | |
| Migración pgvector — columna `embedding` en `knowledge_entries` | ⬜ | Requiere `CREATE EXTENSION vector` en DB |

### 1.2 Autenticación

| Tarea | Estado | Notas |
|-------|--------|-------|
| Login email/password (`POST /auth/login`) | ✅ | JWT implementado |
| Middleware de autenticación (`get_current_user`) | ✅ | |
| Hash de contraseñas con bcrypt | ✅ | |
| Registro de usuario (`POST /auth/register`) | ⬜ | |
| Google SSO — endpoint backend (`POST /auth/google`) | ⬜ | Verifica Google ID token, crea/busca user |
| User model — campos Google (`google_id`, `avatar_url`, `auth_provider`) | ⬜ | `hashed_password` debe ser nullable |
| Migración para nuevos campos de usuario | ⬜ | |

### 1.3 LLM Provider Layer

| Tarea | Estado | Notas |
|-------|--------|-------|
| Interfaz abstracta `LLMProvider` (`base.py`) | ✅ | |
| `GeminiProvider` | 🔧 | Archivo creado, implementar llamada real a API |
| `AnthropicProvider` | 🔧 | |
| `OpenAIProvider` | 🔧 | |
| `LLMFactory` — selección por config | 🔧 | |

### 1.4 Personality Engine

| Tarea | Estado | Notas |
|-------|--------|-------|
| `PromptBuilder` — construir system prompt desde influencer | 🔧 | Archivo creado |
| `PersonalityEngine` — orquesta prompt + LLM | 🔧 | |
| RAG básico (sin pgvector, knowledge base estático) | ⬜ | Para MVP sin embeddings |

### 1.5 Meta Integration

| Tarea | Estado | Notas |
|-------|--------|-------|
| Verificación de webhook (`GET /webhooks/meta`) | 🔧 | Router creado |
| Recepción de comentarios (`POST /webhooks/meta`) | 🔧 | |
| Verificación de firma `X-Hub-Signature-256` | ⬜ | |
| Publicar respuesta aprobada (`graph_api.py`) | 🔧 | |
| `token_manager.py` — manejo de Page Access Token | ⬜ | |

### 1.6 API REST — Endpoints

| Tarea | Estado | Notas |
|-------|--------|-------|
| `GET /influencers` — listar influencers | 🔧 | Router creado, lógica por completar |
| `POST /influencers` — crear influencer | 🔧 | |
| `GET /responses` — cola de respuestas pendientes | 🔧 | |
| `PATCH /responses/{id}/approve` — aprobar respuesta | 🔧 | |
| `PATCH /responses/{id}/reject` — rechazar/ignorar | 🔧 | |
| `POST /responses/{id}/regenerate` — regenerar con LLM | ⬜ | |
| `GET /knowledge` — listar entradas del knowledge base | 🔧 | |
| `POST /knowledge` — agregar entrada | 🔧 | |
| `DELETE /knowledge/{id}` — eliminar entrada | ⬜ | |

### 1.7 Tests Backend

| Tarea | Estado | Notas |
|-------|--------|-------|
| Setup pytest + pytest-asyncio | ⬜ | |
| Tests unitarios — LLM providers (mock) | ⬜ | |
| Tests unitarios — Personality Engine | ⬜ | |
| Tests integración — endpoints auth | ⬜ | |
| Tests integración — endpoints responses | ⬜ | |
| Tests integración — webhook handler | ⬜ | |
| Cobertura mínima 80% | ⬜ | |

---

## Fase 2 — Frontend (Panel de Aprobación)
> Interfaz interna en Next.js para gestionar la cola de respuestas.

### 2.1 Setup

| Tarea | Estado | Notas |
|-------|--------|-------|
| Proyecto Next.js 15 + TypeScript + Tailwind | ✅ | Ya inicializado |
| `next-auth` v5 instalado | ✅ | |
| Cliente HTTP hacia backend (`lib/api.ts`) | ⬜ | |
| Layout base + navegación del dashboard | ⬜ | |
| Pantalla Login (email/pass + Google SSO) | ⬜ | `/login` |
| Pantalla Registro (email/pass + Google SSO) | ⬜ | `/register` |
| NextAuth config — Credentials provider + Google provider | ⬜ | |
| Protección de rutas — redirect a `/login` si no autenticado | ⬜ | |
| Dashboard shell (layout autenticado) | ⬜ | `/dashboard` |

### 2.2 Cola de aprobación

| Tarea | Estado | Notas |
|-------|--------|-------|
| Página `/queue` — lista de respuestas pendientes | ⬜ | |
| Componente `ApprovalCard` — comentario + respuesta + acciones | ⬜ | |
| Acción Aprobar | ⬜ | |
| Acción Editar inline | ⬜ | |
| Acción Regenerar | ⬜ | |
| Acción Ignorar | ⬜ | |
| Filtro por influencer | ⬜ | |
| Polling o WebSocket para actualización en tiempo real | ⬜ | |

### 2.3 Gestión de influencers

| Tarea | Estado | Notas |
|-------|--------|-------|
| Página `/influencers` — lista de influencers | ⬜ | |
| Formulario crear/editar influencer | ⬜ | |
| Editor de system prompt | ⬜ | |

### 2.4 Knowledge Base Editor

| Tarea | Estado | Notas |
|-------|--------|-------|
| Página `/knowledge` — entradas por influencer | ⬜ | |
| Agregar / editar / eliminar entradas | ⬜ | |
| Categorías: biography, opinions, voice_examples, off_limits, etc. | ⬜ | |

### 2.5 Tests Frontend

| Tarea | Estado | Notas |
|-------|--------|-------|
| Tests unitarios — componentes principales | ⬜ | |
| Tests E2E — flujo aprobar respuesta | ⬜ | |
| Tests E2E — login y acceso protegido | ⬜ | |

---

## Fase 3 — RAG + Multiinfluencer
> Inteligencia real: embeddings, búsqueda semántica y soporte multi-cuenta.

| Tarea | Estado | Notas |
|-------|--------|-------|
| Activar extensión `pgvector` en Railway | ⬜ | `CREATE EXTENSION vector;` |
| Generar embeddings al guardar knowledge entries | ⬜ | Usar Gemini embeddings API |
| Implementar búsqueda RAG en `rag.py` | ⬜ | `k` fragmentos más relevantes por cosine similarity |
| Integrar RAG en Personality Engine | ⬜ | |
| Feedback loop: respuestas aprobadas → voice_examples automáticos | ⬜ | |
| Soporte multi-influencer completo (filtros, selección en webhook) | ⬜ | |

---

## Fase 4 — Calidad e Inteligencia
> Métricas, notificaciones y contexto situacional dinámico.

| Tarea | Estado | Notas |
|-------|--------|-------|
| Contexto situacional dinámico (mood, posts recientes del influencer) | ⬜ | |
| Dashboard métricas: tasa aprobación, tasa edición, tasa rechazo | ⬜ | |
| Notificaciones Slack cuando hay comentarios nuevos | ⬜ | |
| Renovación automática de Page Access Token de Meta | ⬜ | |
| Soporte Threads (pendiente apertura API Meta) | ⬜ | |

---

## Fase 4.5 — Expansión de Plataformas
> Integrar redes más allá de Meta. Cada plataforma es un nuevo adapter en `core/platforms/`.

| Tarea | Estado | Notas |
|-------|--------|-------|
| Refactor `platform` field → enum expandido (`instagram`, `facebook`, `threads`, `twitter`, `tiktok`, `onlyfans`) | ⬜ | Ya es String libre, solo documentar valores válidos |
| Twitter/X — leer menciones y replies vía API v2 | ⬜ | Requiere Twitter Developer App |
| Twitter/X — publicar respuesta aprobada | ⬜ | |
| TikTok — leer comentarios vía TikTok API | ⬜ | TikTok for Developers |
| TikTok — publicar respuesta aprobada | ⬜ | |
| OnlyFans — investigar API disponible | ⬜ | API oficial limitada, puede requerir solución alternativa |
| Panel frontend — selector de plataforma en filtros | ⬜ | |

---

## Fase 5 — Producción
> Despliegue, seguridad y monitoreo.

| Tarea | Estado | Notas |
|-------|--------|-------|
| Deploy backend en Railway | ⬜ | |
| Provisionar PostgreSQL en Railway + activar pgvector | ⬜ | |
| Deploy frontend en Vercel | ⬜ | |
| Configurar webhooks en Meta Developer Console | ⬜ | |
| Variables de entorno en producción | ⬜ | |
| CI/CD — GitHub Actions (tests en cada PR) | ⬜ | |
| Monitoreo de errores (Sentry o Railway logs) | ⬜ | |

---

## Orden de trabajo sugerido

```
Fase 1.2 (Auth) → Fase 1.3 (LLM) → Fase 1.4 (Personality Engine)
→ Fase 1.5 (Meta) → Fase 1.6 (API endpoints) → Fase 1.7 (Tests)
→ Fase 2 (Frontend) → Fase 3 (RAG) → Fase 4 → Fase 5
```

---

*Última actualización: 2026-04-18*
