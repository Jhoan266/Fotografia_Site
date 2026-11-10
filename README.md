# Vera Solís — Fotografía (plataforma)

Plataforma de portafolio público + área privada para entregar sesiones a clientes, seleccionar imágenes, comentar y descargar.

## Stack

- Next.js + TypeScript
- PostgreSQL + Prisma
- bcrypt + iron-session
- Rate limiting persistente en PostgreSQL
- Storage modular: local o S3-compatible
- i18n ES / EN / FR
- Docker / Docker Compose

## Storage

La aplicación no depende directamente del filesystem. Usa un contrato `StorageProvider`.

### Local

```env
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./storage
```

### S3-compatible

Compatible con servicios que implementen AWS Signature V4, por ejemplo AWS S3, Cloudflare R2 y MinIO.

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=https://example-endpoint
S3_REGION=us-east-1
S3_BUCKET=fotografia
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_FORCE_PATH_STYLE=true
```

Para AWS S3 normalmente puede utilizarse virtual-host style configurando `S3_FORCE_PATH_STYLE=false`. Para MinIO/R2 suele ser conveniente path-style según el endpoint utilizado.

## Desarrollo local

```bash
cp .env.example .env
npm install
docker compose up -d postgres
npx prisma migrate deploy
npm run dev:host
```

## Verificación

```bash
npm run lint
npm run typecheck
npm run build
```

## Seguridad

- Secretos de sesión obligatorios.
- Sesiones httpOnly.
- Roles verificados en servidor.
- Rate limiting persistente de login.
- Mutaciones API con verificación de origen.
- Validación de subidas y rutas.
- Storage encapsulado por provider.
- Seed demo bloqueado en producción.
- PostgreSQL no expuesto por defecto.

Antes de producción deben completarse pruebas automatizadas, observabilidad, backups y políticas de retención.

## Administrator two-step verification

Configure each administrator before deploying this migration. It revokes existing
administrator sessions, and accounts without a configured key cannot sign in.
Client sign-in still uses email and password.

1. Generate a unique key for each administrator in a private terminal:
   `node -e "const {randomInt}=require('node:crypto');const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';console.log(Array.from({length:32},()=>a[randomInt(32)]).join(''))"`
2. Add the key to the administrator's authenticator app as a time-based account
   with SHA-1, six digits and a 30-second period. Share the key through a secure
   channel and keep a protected recovery copy.
3. Configure `ADMIN_TOTP_SECRETS` in the deployment secret store as a JSON object
   keyed by lowercase administrator email. For Compose, use the untracked
   environment file. Restart the web service and verify sign-in with a new code.

For a lost device or suspected key exposure, provision a new key and revoke
the affected user's sessions by deleting their rows in `AuthSession` through
your trusted database administration channel. Keep the old key out of the new
configuration. There is no self-service reset or recovery-code flow.

### Prueba local en un proyecto Docker aislado

La siguiente clave es un dato de prueba publico. Usala solo en este proyecto
temporal, que no publica el puerto web.

```powershell
$env:ADMIN_TOTP_SECRETS = '{"qa-mfa@example.invalid":"GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"}'
docker compose -p fotografia-totp-qa run -d --build --name fotografia-totp-qa-web web
# Espera a que docker logs fotografia-totp-qa-web indique que Next.js esta listo.
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Raw -Encoding UTF8 tests/admin-docker-smoke.mjs | docker exec -i -e ALLOW_LOCAL_SMOKE=1 -e SMOKE_TOTP_EMAIL=qa-mfa@example.invalid fotografia-totp-qa-web node --input-type=module
docker rm -f fotografia-totp-qa-web
docker compose -p fotografia-totp-qa down -v
Remove-Item Env:ADMIN_TOTP_SECRETS
```

## Proxy de confianza en produccion

Compose publica el puerto web y los puertos opcionales de MinIO solo en
`127.0.0.1`. Para publicar el sitio, usa un proxy HTTPS en el mismo host y
configura `NEXT_PUBLIC_APP_URL` con el origen publico exacto. Si el proxy vive
en Docker, conecta ambos servicios a una red privada y usa `web:3000`.

Genera una clave aleatoria exclusiva para `TRUSTED_PROXY_TOKEN` y configura el
mismo valor en el entorno de la aplicacion y en la configuracion privada del
proxy. El proxy debe sobrescribir las dos cabeceras internas en cada solicitud.
En Nginx, dentro del bloque del sitio HTTPS:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Studio-Client-IP $remote_addr;
    proxy_set_header X-Studio-Proxy-Token "REPLACE_WITH_DEPLOYMENT_SECRET";
}
```

Si hay un CDN delante, configura el proxy para aceptar la IP original solo
desde los rangos de confianza de ese CDN. El acceso directo en desarrollo
funciona con una URL HTTP de loopback sin clave y mantiene el limite por
cuenta. En una URL publica, el inicio de sesion requiere el proxy configurado.
