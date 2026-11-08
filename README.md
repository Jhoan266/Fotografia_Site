# Vera Solís — Fotografía (plataforma)

Sitio público de portafolio + área privada para entregar sesiones a clientes (galerías, favoritos, comentarios, selección de álbum y descarga). Marca placeholder: **Vera Solís** (Barcelona).

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth: bcrypt, sesiones httpOnly (iron-session), rate-limit de login, roles `ADMIN` | `CLIENT`
- Storage local (`STORAGE_DRIVER=local`); perfil Docker `minio` opcional
- i18n: ES (default) / EN / FR vía next-intl

## Requisitos

- Node.js 20+
- Docker (recomendado para Postgres) o PostgreSQL 16 local

## Arranque rápido

```bash
git clone https://github.com/Jhoan266/Fotografia_Site.git
cd Fotografia_Site
cp .env.example .env
docker compose up -d postgres
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev:host
```

Abre **http://localhost:3000/es**

### Stack completo (web + postgres)

```bash
cp .env.example .env
docker compose up --build
```

MinIO opcional:

```bash
docker compose --profile minio up -d
```

## Credenciales seed

| Rol     | Email                    | Password   |
|---------|--------------------------|------------|
| Admin   | `admin@verasolis.studio` | `Demo1234!` |
| Cliente | `cliente@demo.com`       | `Demo1234!` |

## Rutas útiles

- Marketing: `/es`, `/en`, `/fr`
- Login: `/es/login`
- Cliente: `/es/app`
- Admin: `/es/admin`

## Notas

- Solo el fotógrafo (admin) sube fotos.
- Packs + `Order` están listos; el pago en vivo (Stripe) queda diferido — UI “próximamente”.
- Sustituye placeholders de marca/contacto en `src/lib/content.ts` y mensajes i18n en `messages/`.
