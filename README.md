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
