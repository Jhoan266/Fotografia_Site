#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ $# != 1 || ! -d $1 ]]; then
  printf 'Usage: bash scripts/backup-local.sh EXISTING_PRIVATE_BACKUP_DIRECTORY\n' >&2
  exit 2
fi

destination=$(cd -- "$1" && pwd -P)
lock=.fotografia-backup.lock
if ! mkdir -- "$lock"; then
  printf 'A backup is already running or the backup lock needs attention.\n' >&2
  exit 1
fi

stage=
resume=false
cleanup() {
  status=$?
  trap - EXIT
  if "$resume" && ! docker compose start web >&2; then
    printf 'Could not restart the web service. Check Docker Compose.\n' >&2
    status=1
  fi
  if [[ -n $stage ]]; then
    rm -f -- "$stage/fotografia.dump" "$stage/photos.tar.gz" "$stage/SHA256SUMS"
    rmdir -- "$stage"
  fi
  rmdir -- "$lock"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ -z $(docker compose ps --status running -q web) ]]; then
  printf 'The web service must be running before starting a backup.\n' >&2
  exit 1
fi
docker compose exec -T web sh -ec '[ "${STORAGE_DRIVER:-local}" = local ]' < /dev/null

stage=$(mktemp -d "$destination/.incomplete.XXXXXXXX")
stamp=$(date -u +%Y%m%dT%H%M%SZ)
name="fotografia-${stamp}-${stage##*.}"

resume=true
docker compose stop web >&2
docker compose exec -T postgres sh -ec \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' \
  < /dev/null > "$stage/fotografia.dump"
docker compose run --rm --no-deps -T --entrypoint sh web -ec 'tar -C "${STORAGE_LOCAL_PATH:-/app/storage}" -czf - .' \
  < /dev/null > "$stage/photos.tar.gz"
docker compose start web >&2
resume=false

docker compose exec -T postgres pg_restore --list < "$stage/fotografia.dump" > /dev/null
tar -tzf "$stage/photos.tar.gz" > /dev/null
(cd "$stage" && sha256sum fotografia.dump photos.tar.gz > SHA256SUMS)
mv -T -- "$stage" "$destination/$name"
stage=
printf '%s\n' "$destination/$name"
