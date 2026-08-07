# Operación

## Dónde vive cada cosa

| Componente | Plataforma | Notas |
|-----------|-----------|-------|
| Backend | Railway — servicio `virtualvoice` | Docker, Python 3.12 |
| PostgreSQL | Railway — servicio `Postgres` | Con extensión `vector` |
| Redis | Railway — servicio `Redis` | Solo rate limiting; falla abierto |
| Frontend | Vercel | Next.js, deploy por push |
| Imágenes | Cloudinary | Carpeta `virtualvoice/` |

## Variables de entorno

### Backend (Railway)

| Variable | Obligatoria | Efecto si falta |
|----------|-------------|-----------------|
| `DATABASE_URL` | Sí | No arranca |
| `SECRET_KEY` | Sí | No firma JWT |
| `TOKEN_ENCRYPTION_KEY` | **Sí** | **No arranca** — impide guardar tokens en texto plano |
| `META_OAUTH_STATE_SECRET` | Sí en producción | **No arranca** en producción |
| `LLM_PROVIDER` | Sí | — |
| `{PROVIDER}_API_KEY` | Sí, la del proveedor activo | **No arranca** |
| `REDIS_URL` | No | Rate limiting en memoria, no compartido entre réplicas |
| `CLOUDINARY_CLOUD_NAME` | No | Los avatares quedan con URL de Meta y el CSP los bloquea |
| `CLOUDINARY_API_KEY` | No | Igual que arriba |
| `CLOUDINARY_API_SECRET` | No | Igual que arriba |
| `DEBUG` | No | **No arranca** si es `true` en producción |

### Frontend (Vercel)

| Variable | Para qué |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | Base de la API — entra en `connect-src` de la CSP |
| `AUTH_SECRET` | NextAuth |
| `AUTH_URL` / `NEXTAUTH_URL` | Callbacks de NextAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | SSO |

El frontend **no** lleva variables de Cloudinary: la URL ya viene resuelta desde la API.

## Desarrollo local

```bash
cp .env.example .env
# completar credenciales
docker compose up
```

Servicios: `db:5433`, `backend:8001`, `frontend:3000`.

Migraciones la primera vez:

```bash
docker compose exec backend alembic upgrade head
```

> **Ojo con la base local.** `DATABASE_URL` en desarrollo apunta a `db:5432` (hostname de Docker Compose). Un script corrido desde el host contra esa URL no resuelve, y uno corrido dentro del contenedor pega contra la base **local**, no la de producción.

## Migraciones

```bash
# crear
alembic revision --autogenerate -m "descripción"

# aplicar
alembic upgrade head

# revertir una
alembic downgrade -1
```

En Railway se aplican al desplegar.

## Scripts

### Backfill de avatares

Migra los avatares que todavía apuntan al CDN de Meta hacia Cloudinary. Las filas anteriores a [PR #67](https://github.com/adelgadox/virtualvoice/pull/67) las tienen así, y el CSP del frontend las bloquea.

```bash
cd backend

# contra producción, sin escribir nada
railway run --service virtualvoice python -m scripts.backfill_avatars --dry-run

# de verdad
railway run --service virtualvoice python -m scripts.backfill_avatars
```

Lo primero que imprime es la base contra la que va a trabajar:

```
INFO database: db.railway.internal:5432/railway
```

Ese renglón está ahí porque un reporte de ceros es ambiguo sin él — corriste contra la base equivocada y contra una base ya migrada se ven idénticos.

Cómo leer la salida:

| Contador | Significa |
|----------|-----------|
| `instagram accounts` | Total de cuentas en esa base. Si es 0, revisá el host |
| `scanned` | Cuántas siguen con URL de Meta |
| `migrated` | Copiadas a Cloudinary |
| `skipped (no token)` | Sin token guardado o imposible de descifrar |
| `skipped (no photo)` | El token de Meta expiró — **solo se arregla reconectando la cuenta** |
| `failed upload` | Cloudinary rechazó la subida. Re-ejecutar reintenta solo esas |

Es re-ejecutable: las cuentas ya migradas quedan fuera del filtro, y cada subida sobrescribe por `account_id`.

Requiere las tres `CLOUDINARY_*` y `TOKEN_ENCRYPTION_KEY`. Sin las primeras sale con exit 1 y un mensaje claro, antes de tocar nada.

## Imágenes

Cloudinary hace la optimización, **no Vercel**. `frontend/next.config.ts` declara `loader: "custom"` apuntando a `src/lib/cloudinary-loader.ts`, así que ninguna request pasa por `/_next/image` y no se facturan unidades de optimización.

El backend sube el avatar a `virtualvoice/avatars` cuando se conecta una cuenta de Instagram (`app/services/cloudinary_avatar.py`), con `public_id = account_id` para que reconectar sobrescriba en vez de acumular copias.

Por qué así y no de otra forma: Meta firma sus URLs de foto de perfil con expiración corta, así que guardarlas tal cual las pudre solas. Y el modo *fetch* de Cloudinary — que sería lo natural para una URL remota — no tiene carpetas, así que no permitía separar este proyecto de los otros en la misma cuenta.

**La subida no bloquea el OAuth.** El callback guarda la URL de Meta y agenda el copiado como background task de FastAPI, después de emitir el redirect. Es una ida y vuelta a un tercero por cada cuenta conectada, y hacer esperar al usuario no compra nada: la fila queda válida igual, y hasta que aterrice la copia se ve la inicial del influencer.

La consecuencia a tener presente: entre el redirect y el fin de la tarea hay una ventana en que la fila todavía tiene la URL de Meta. Si el proceso muere en esa ventana, la copia no ocurre y esa cuenta queda para el [backfill](#backfill-de-avatares).

Si las variables de Cloudinary faltan, el sistema degrada solo: el avatar conserva la URL de Meta, el CSP la bloquea y se ve la inicial del influencer. Nada se rompe.

## Cuando algo falla

| Síntoma | Primer lugar donde mirar |
|---------|--------------------------|
| El backend no arranca | Las guardas de `main.py` — el mensaje dice cuál variable falta |
| Todas las requests lentas | Redis caído: el limitador falla abierto pero paga el timeout de 100ms |
| Avatares en blanco | `CLOUDINARY_*` sin setear, o filas viejas sin backfill |
| El panel no muestra comentarios nuevos | Firma del webhook: `META_APP_SECRET` desalineado |
| Build de Vercel roto sin cambios aparentes | Un build en frío destapa errores de tipo que el caché incremental ocultaba |

Ese último tiene historia: un `TS2741` estuvo latente 3,5 meses porque el caché de build de Vercel más `tsc` incremental lo saltaban, y solo salió cuando una branch sin caché forzó un typecheck completo ([PR #63](https://github.com/adelgadox/virtualvoice/pull/63)).
