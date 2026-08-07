# Testing

218 tests: **122 en backend**, **96 en frontend**.

## Correrlos

```bash
# backend
cd backend && pytest -q
cd backend && pytest --cov=app --cov-report=term-missing

# frontend
cd frontend && npx jest
cd frontend && npm run lint
cd frontend && npx tsc --noEmit
```

## Backend — `backend/tests/`

| Suite | Tests | Cubre |
|-------|------:|-------|
| `test_auth.py` | 22 | Registro, login, Google SSO, `/auth/me`, JWT real (solo la DB está mockeada) |
| `test_api_endpoints.py` | 17 | Influencers, knowledge, responses, permisos por rol |
| `test_avatar_backfill.py` | 17 | Selección de filas, casos donde **no** debe escribir, conteos |
| `test_llm_providers.py` | 13 | Gemini, Anthropic, OpenAI-compatible y el factory |
| `test_personality.py` | 12 | Construcción del prompt, contexto situacional |
| `test_cloudinary_avatar.py` | 16 | Subida, carpeta, degradación ante fallos, sync en background |
| `test_rate_limit.py` | 11 | Inyección de timeouts en la URL de Redis, `get_client_ip` |
| `test_rag_embeddings.py` | 10 | Recuperación por similitud, acotada por influencer |
| `test_instagram_callback.py` | 4 | El callback de OAuth agenda el avatar en vez de esperarlo |

## Frontend — `frontend/src/__tests__/`

| Suite | Cubre |
|-------|-------|
| `InfluencersPage` | Retorno de OAuth: toast, modal derivado, no reabrir tras cerrar |
| `SocialAccountsList` | Loading derivado, cancelación de respuestas rancias, desconexión |
| `QueuePage` | Loading, filtro, y que el poll de 30s no parpadee el skeleton |
| `HistoryPage` | Loading, filtro, request previa que aterriza tarde |
| `KnowledgePage` | Loading, filtro, estados vacíos |
| `cloudinaryLoader` | Forma de la URL, transformaciones, pass-through |
| `InfluencerCard` | Render, avatar vía Cloudinary |
| `ApprovalCard` | Aprobar, ignorar, regenerar, edición inline |
| `KnowledgeEntryRow` | Render, expandir, eliminar |

## Convenciones

**Un test que pasa con y sin el cambio no protege nada.** Al arreglar un bug o refactorizar, corré la suite nueva contra el código viejo y verificá que falla. Si pasa igual, documenta comportamiento — está bien, pero no lo cuentes como red de seguridad.

Esa distinción está anotada explícitamente en varias suites: de los 47 tests que se agregaron con el refactor de effects, solo 3 fallaban contra el código anterior.

**Mockear en el borde.** `apiFetch` en frontend, la sesión de DB en backend. La lógica real corre — los tests de auth ejercitan la creación y validación de JWT de verdad.

**Los casos donde algo *no* debe pasar valen tanto como los felices.** El backfill tiene cinco tests dedicados a que no escriba: dry-run, sin token, token indescifrable, foto ausente, subida fallida. Ese último atrapa un error sutil — `upload_avatar` devuelve su entrada cuando falla, así que sin verificar el host se escribiría la URL de Meta como si hubiera funcionado.

## Lo que no está cubierto

- No hay E2E. Los flujos que cruzan backend y frontend se prueban por separado.
- El OAuth de Instagram se prueba con la Graph API mockeada; el flujo real necesita credenciales de Meta.
- El webhook de Meta se prueba a nivel de verificación de firma, no de extremo a extremo.
- `frontend/src/app/dashboard/page.tsx`, `/metrics` y `/studio` no tienen tests.
