# Seguridad

Tres rondas de endurecimiento están completas (fases [6](roadmap/phase-06-security-hardening.md), [7](roadmap/phase-07-security-hardening-round-2.md) y [8](roadmap/phase-08-security-hardening-round-3.md) del roadmap). Este documento describe el estado actual, no el histórico.

## Qué protege el sistema

| Activo | Por qué importa |
|--------|-----------------|
| Tokens de acceso de Meta | Permiten publicar en la cuenta de Instagram del influencer |
| Claves de proveedores LLM | Gasto directo si se filtran |
| Base de conocimiento | Material privado del influencer |
| Cola de aprobación | Publicar sin aprobación humana es el peor escenario del producto |

## Autenticación

- Email/password con bcrypt, o Google SSO.
- JWT firmado con `SECRET_KEY`, validado en `get_current_user` (`app/dependencies.py`).
- Logout **revoca de verdad**: el JWT entra en `token_denylist` y una tarea de fondo limpia los expirados.
- Tres roles: `user`, `admin`, `superadmin`. Las dependencias `get_current_admin` y `get_current_superadmin` los aplican por endpoint.

## Cifrado en reposo

Los tokens de Meta se cifran con Fernet antes de tocar la base.

`validate_encryption_key()` corre al importar `main.py`: si `TOKEN_ENCRYPTION_KEY` falta o no es una clave Fernet válida, **la app no arranca**. Es deliberado — arrancar sin ella significaría guardar tokens en texto plano, que es exactamente el fallo silencioso que la validación existe para impedir.

Generar una:

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Guardas de arranque

`main.py` se niega a arrancar si:

| Condición | Motivo |
|-----------|--------|
| `DEBUG=true` con `RAILWAY_ENVIRONMENT=production` | Trazas y detalles de error expuestos |
| `TOKEN_ENCRYPTION_KEY` ausente o inválida | Tokens en texto plano |
| `META_OAUTH_STATE_SECRET` ausente en producción | `state` de OAuth falsificable |
| `LLM_PROVIDER` sin su API key | Fallo en el primer comentario, no al desplegar |

El patrón es el mismo en los cuatro: fallar al arrancar, no en la primera request.

## Webhooks de Meta

`POST /webhooks/meta` verifica `X-Hub-Signature-256` con HMAC-SHA256 sobre el cuerpo crudo, comparado con `hmac.compare_digest` (tiempo constante). Sin firma válida no se procesa nada.

## OAuth de Instagram

El `state` va firmado con HMAC usando `META_OAUTH_STATE_SECRET` — un secreto dedicado, no `SECRET_KEY` — y lleva:

- `exp`, ventana de 10 minutos
- `initiating_user_id`, verificado contra un usuario activo en el callback

Esto cierra dos agujeros a la vez: replay de un `state` viejo, e IDOR a través de una cuenta desactivada.

## Rate limiting

slowapi con Redis como almacén compartido, para que los límites valgan entre réplicas.

| Límite | Se aplica a |
|--------|-------------|
| `5/hour` | Registro |
| `10/minute` | Login y operaciones sensibles |
| `20/minute` | Escrituras |
| `30/minute` | Lecturas de dashboard |
| `60/minute` | Listados |
| `300/minute` | Webhooks |

**Falla abierto por diseño.** Si Redis no responde, el limitador deja pasar en vez de devolver 500 — un Redis caído no puede tumbar el producto entero. El timeout de socket está en 100ms para que la degradación sea imperceptible (ver [PR #54](https://github.com/adelgadox/virtualvoice/pull/54)).

La contrapartida, explícita: mientras Redis esté caído no hay rate limiting, y no hay alerta que lo avise.

## Cabeceras HTTP

El backend agrega en cada respuesta:

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains   (solo producción)
```

## CSP del frontend

`frontend/src/middleware.ts` arma la CSP por request:

```
default-src 'self'
script-src  'self' 'unsafe-inline' https://va.vercel-scripts.com
style-src   'self' 'unsafe-inline'
img-src     'self' data: https://res.cloudinary.com https://lh3.googleusercontent.com https://graph.facebook.com
font-src    'self' https://fonts.gstatic.com
connect-src 'self' <API_URL> https://accounts.google.com https://vitals.vercel-insights.com
frame-src   'none'
object-src  'none'
base-uri    'self'
form-action 'self'
```

Dos notas honestas sobre esta CSP:

- **`'unsafe-inline'` en `script-src`** sigue ahí: el App Router inyecta scripts de hidratación sin nonce, y propagar uno requiere integración a nivel de layout que aún no está hecha.
- **Los CDN de Meta no están en `img-src`, a propósito.** Los avatares de Instagram llegan vía Cloudinary, nunca directo. Antes de [PR #67](https://github.com/adelgadox/virtualvoice/pull/67) apuntaban a `scontent-*.cdninstagram.com` y el navegador los bloqueaba en silencio.

## Áreas conocidas sin cubrir

Honestidad sobre lo que falta, no una lista de logros:

- No hay alerta cuando el rate limiting cae a modo abierto por Redis caído.
- `'unsafe-inline'` en `script-src` sigue pendiente de la migración a nonce.
- Las fases [9](roadmap/phase-09-ath-signal-filtering.md) y [10](roadmap/phase-10-ath-intelligence.md) incluyen filtrado de contenido tóxico entrante; hoy no existe.
- No hay auditoría de accesos: quién aprobó qué queda en `pending_responses.approved_by`, pero no hay bitácora general.
