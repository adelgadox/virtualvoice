# VirtualVoice — AI-Powered Virtual Influencer Response System

Sistema para operar influencers virtuales en redes sociales. La IA propone la respuesta, una persona la aprueba, y recién ahí se publica.

```
Comentario recibido → la IA genera una respuesta → alguien la aprueba → se publica
```

**Nada se publica sin aprobación humana.** Esa restricción es el producto, no una limitación temporal: garantiza calidad, consistencia de marca y control total sobre lo que dice cada influencer.

---

## Documentación

| Documento | Para qué |
|-----------|----------|
| [Arquitectura](docs/architecture.md) | Flujo de un comentario, capas del backend, motor de personalidad, RAG |
| [Seguridad](docs/security.md) | Autenticación, cifrado de tokens, rate limiting, CSP, huecos conocidos |
| [Operación](docs/operations.md) | Deploy, variables de entorno, migraciones, scripts y runbooks |
| [Testing](docs/testing.md) | Qué cubre cada suite y cómo correrlas |
| [Roadmap](docs/roadmap/README.md) | 14 fases · 157 tareas listas · 92 pendientes |

---

## Qué hace

- **Motor de personalidad** — cada influencer tiene identidad, tono y base de conocimiento propios
- **Agnóstico de LLM** — Gemini, Claude, GPT-4o u otro sin tocar la lógica de negocio
- **Humano en el ciclo** — toda respuesta pasa por aprobación
- **RAG sobre la personalidad** — la base de conocimiento de cada influencer se consulta por similitud con pgvector
- **Contexto situacional** — fecha de hoy, nota manual de estado y posts recientes, inyectados en cada prompt
- **Multi-influencer** — varios influencers desde el mismo sistema
- **Métricas** — tasas de aprobación, edición e ignorado por influencer
- **Renovación automática de tokens** — un job refresca los Page Access Tokens de Meta antes de que expiren

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI · SQLAlchemy · Alembic · Pydantic v2 |
| Base de datos | PostgreSQL + pgvector |
| Cache | Redis (rate limiting, falla abierto) |
| Frontend | Next.js App Router · TypeScript · Tailwind · NextAuth |
| LLM | Gemini · Anthropic · cualquier endpoint compatible con OpenAI |
| Integraciones | Meta Graph API · Cloudinary |
| Deploy | Railway (backend) · Vercel (frontend) |

## Estructura

```
backend/
  app/
    routers/      HTTP: auth, influencers, knowledge, responses,
                  social_accounts, metrics, studio, webhooks
    core/
      llm/        proveedores + factory
      personality/ engine, RAG, prompt builder
      meta/       OAuth, Graph API, webhooks, tokens
    services/     Cloudinary, backfill de avatares
    models/       SQLAlchemy
    schemas/      Pydantic — el contrato de la API
    utils/        cifrado, rate limiting
  alembic/        migraciones
  scripts/        utilidades operativas
  tests/          113 tests

frontend/
  src/
    app/          App Router: login, dashboard, studio
    components/   por dominio
    lib/          cliente de API, loader de Cloudinary
    __tests__/    96 tests

docs/             arquitectura, seguridad, operación, testing, roadmap
```

## Desarrollo local

```bash
cp .env.example .env
# completar credenciales

docker compose up
docker compose exec backend alembic upgrade head
```

Servicios: `db:5433` · `backend:8001` · `frontend:3000`

Detalle de variables de entorno y despliegue en [operación](docs/operations.md).

## Tests

```bash
cd backend  && pytest -q          # 113
cd frontend && npx jest           # 96
cd frontend && npm run lint       # 0 errores, 0 warnings
```

## Contribuir

**Nunca push directo a `main`.** Todo va por branch + PR — ver [`CLAUDE.md`](CLAUDE.md).

Al completar tareas del roadmap, actualizá el archivo de fase y la tabla resumen de [`docs/roadmap/README.md`](docs/roadmap/README.md) en el mismo PR.
