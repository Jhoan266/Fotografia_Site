# Vera Solís — Fotografía (plataforma)

Sitio público de portafolio + área privada para entregar sesiones a clientes: galerías, favoritos, comentarios, selección de álbum y descarga. La marca y el contenido actuales son placeholders.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- bcrypt + iron-session
- Rate limiting persistente en PostgreSQL
- Storage local en desarrollo; adaptador S3 pendiente
- i18n ES / EN / FR con next-intl
- Docker / Docker Compose

## Desarrollo local

1. Copia el archivo de entorno y sustituye **todos** los valores `replace_me`.
2. Usa un `SESSION_SECRET` aleatorio de al menos 32 caracteres.
3. No reutilices credenciales de desarrollo en producción.

```bash
git clone https://github.com/Jhoan266/Fotografia_Site.git
cd Fotografia_Site
cp .env.example .env
npm install
docker compose up -d postgres
npx prisma migrate deploy
npm run dev:host
```

La aplicación estará disponible en `http://localhost:3000/es`.

## Datos demo

El seed es únicamente para desarrollo y **se niega a ejecutarse con NODE_ENV=production**.

Para cargar datos demo manualmente:

```bash
DEMO_PASSWORD='elige-una-clave-local-segura' npm run db:seed
```

No existen credenciales demo destinadas a producción y el contenedor web no ejecuta el seed automáticamente.

## Docker

El stack exige `POSTGRES_PASSWORD` y `SESSION_SECRET` explícitos. PostgreSQL no publica su puerto al host en el compose de aplicación.

```bash
docker compose up --build
```

## Verificación

```bash
npm run lint
npm run typecheck
npm run build
```

## Rutas

- Marketing: `/es`, `/en`, `/fr`
- Login: `/es/login`
- Cliente: `/es/app`
- Admin: `/es/admin`

## Seguridad

- Sesiones httpOnly y secure en producción.
- Secretos obligatorios; sin fallback de producción.
- Roles ADMIN / CLIENT verificados en servidor.
- Protección de mutaciones API por origen.
- Límites y validación de subidas.
- Validación de rutas de almacenamiento.
- Descargas privadas con headers endurecidos.
- Rate limiting de login persistente.

Antes de un despliegue real deben completarse pruebas automatizadas, almacenamiento de objetos S3 compatible, observabilidad, backups y revisión de dependencias.
