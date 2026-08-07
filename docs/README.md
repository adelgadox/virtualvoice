# Documentación — VirtualVoice

| Documento | Para qué |
|-----------|----------|
| [Arquitectura](architecture.md) | Cómo está armado el sistema: flujo de un comentario, capas del backend, motor de personalidad, RAG |
| [Seguridad](security.md) | Modelo de amenazas, autenticación, cifrado de tokens, rate limiting, cabeceras, CSP |
| [Operación](operations.md) | Deploy, variables de entorno, migraciones, scripts y runbooks |
| [Testing](testing.md) | Qué cubre cada suite, cómo correrlas, convenciones |
| [Roadmap](roadmap/README.md) | 14 fases con su estado y tareas |

## Convenciones del repo

- **Nunca push directo a `main`.** Todo va por branch + PR — ver [`CLAUDE.md`](../CLAUDE.md).
- Los tests de backend viven en `backend/tests/`; los de frontend en `frontend/src/__tests__/`.
- Las migraciones son de Alembic, en `backend/alembic/versions/`.
- Un archivo de fase del roadmap se actualiza en el mismo PR que completa sus tareas.
