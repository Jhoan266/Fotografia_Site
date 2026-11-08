#!/bin/sh
set -eu

: "${SESSION_SECRET:?SESSION_SECRET is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"

npx prisma migrate deploy

if [ "${RUN_DEMO_SEED:-false}" = "true" ]; then
  if [ "${NODE_ENV:-production}" = "production" ]; then
    echo "Refusing to run demo seed in production." >&2
    exit 1
  fi
  npx tsx prisma/seed.ts
fi

exec npm run start
