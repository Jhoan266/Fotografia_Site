#!/bin/sh
set -e
npx prisma migrate deploy
npx tsx prisma/seed.ts || true
exec npm run start
