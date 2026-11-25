#!/usr/bin/env bash
# Starts a release on the VPS: pulls both images, migrates the database, then
# swaps the app. The deploy workflow runs it over SSH; it also works by hand:
#
#   ./release.sh toolshypermarket.com ghcr.io/org/nies:<sha> ghcr.io/org/nies-migrate:<sha> \
#     'www.toolshypermarket.com new.toolshypermarket.com'
#
# The last argument is optional: other names that redirect to the site domain.
# Run it from the directory holding compose.yaml, Caddyfile and .env.app.local.
# The previous release's settings are kept in .env.release.previous, so a
# rollback is (check the database schema still suits the older app first):
#   (set -a; . ./.env.release.previous; ./release.sh "$SITE_DOMAIN" "$APP_IMAGE" "$MIGRATION_IMAGE" "${SITE_ALIASES:-}")
set -euo pipefail

if [ "$#" -lt 3 ] || [ "$#" -gt 4 ]; then
  echo "usage: $0 <site-domain> <app-image> <migration-image> [site-aliases]" >&2
  exit 64
fi

# Caddy separates site names with spaces; accept commas too.
site_aliases="$(echo "${4:-}" | tr ',' ' ' | xargs)"

cd "$(dirname "$0")"

if [ ! -f .env.app.local ]; then
  echo "release: .env.app.local is missing in $(pwd); create it before the first release." >&2
  exit 1
fi

printf 'SITE_DOMAIN=%s\nAPP_IMAGE=%s\nMIGRATION_IMAGE=%s\nSITE_ALIASES="%s"\n' "$1" "$2" "$3" "$site_aliases" > .env.release.next

compose() { docker compose --env-file .env.release.next "$@"; }

compose --profile migration pull
# The running app keeps serving the old release while the schema moves ahead,
# so a migration has to suit both releases for that short window.
compose run --rm migrate
compose up -d --remove-orphans
# A bind-mounted Caddyfile change doesn't recreate the container; reload it.
compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile

if [ -f .env.release.local ]; then mv .env.release.local .env.release.previous; fi
mv .env.release.next .env.release.local

docker compose --env-file .env.release.local ps
# Clear untagged layers left by earlier pulls. Tagged releases stay for rollback.
docker image prune -f >/dev/null
