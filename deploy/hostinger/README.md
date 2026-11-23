# Hostinger Docker setup

The VPS runs Caddy and the Next.js/Payload app on the same Docker network. Caddy publishes ports 80 and 443 and gets the HTTPS certificate. The app uses port 3000 inside Docker and connects to Neon and R2. A third container runs the database migrations once per release.

Releases are built and started by the **Deploy to Hostinger** workflow ([.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)). It builds both images in GitHub Actions, pushes them to GitHub's container registry, copies this directory's `compose.yaml`, `Caddyfile` and `release.sh` to `~/nies` on the VPS, and runs `release.sh` there.

## 1. Prepare the VPS (once)

On Ubuntu 24.04, as root:

```sh
apt update && apt upgrade -y
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

After confirming `ssh deploy@<vps>` works, turn off password and root login:

```sh
printf 'PasswordAuthentication no\nPermitRootLogin no\n' | sudo tee /etc/ssh/sshd_config.d/00-hardening.conf
sudo systemctl restart ssh
```

## 2. DNS

Point the site's hostname at the VPS with an `A` record. Caddy assumes visitors connect to it directly: on Cloudflare, use DNS-only mode. A proxy in front of Caddy needs separate trusted-proxy configuration for rate limits to see the visitor's IP.

## 3. App settings on the VPS (once, and when they change)

As `deploy`, create `~/nies/.env.app.local` and restrict it (`chmod 600`). Use [.env.example](../../.env.example) as the list: one unquoted `KEY=value` per line, unused optional keys left out. It holds the pooled Neon `DATABASE_URL`, a stable `PAYLOAD_SECRET`, `NEXT_PUBLIC_SITE_URL` (with `https://`), R2, Razorpay, Resend, SMS, Google, Turnstile, Sentry and `CRON_SECRET`. These secrets stay on the VPS; GitHub never sees them.

After changing it, apply it with `cd ~/nies && docker compose --env-file .env.release.local up -d`.

## 4. GitHub settings (once)

Create a deploy key used only by GitHub Actions, and allow it on the VPS:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/nies_actions -N "" -C "github-actions-deploy"
ssh-copy-id -i ~/.ssh/nies_actions.pub deploy@<vps>
ssh-keyscan -t ed25519 <vps>          # the VPS_KNOWN_HOSTS value
```

In the repository, open **Settings → Environments → New environment**, name it `production`, and add:

| Kind | Name | Value |
|---|---|---|
| Secret | `VPS_HOST` | the VPS IP |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | contents of `~/.ssh/nies_actions` (the private key) |
| Secret | `VPS_KNOWN_HOSTS` | the `ssh-keyscan` output line |
| Secret | `NEON_API_KEY` | Neon → Account settings → API keys |
| Variable | `NEON_PROJECT_ID` | Neon → Project settings → General |
| Variable | `SITE_URL` | `https://<hostname>`, no trailing slash |
| Variable | `R2_PUBLIC_URL` | same as on the VPS |
| Variable | `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | optional, same as on the VPS |
| Variable | `NEON_DATABASE`, `NEON_ROLE` | only if not `neondb` / `neondb_owner` |

Delete the local copy of the private key once it is saved in GitHub, or keep it in a password manager. Add required reviewers to the environment to control who can deploy.

`NEXT_PUBLIC_*` values are fixed into the image at build time, so a change to them (including moving from a staging hostname to the real domain) needs a new deploy, not just an edit to `.env.app.local`.

## 5. Deploy

**Actions → Deploy to Hostinger → Run workflow**, pick the branch. The workflow:

1. Builds and pushes the migration image.
2. Copies the live database to a temporary Neon branch and migrates it, so the build prerenders real catalogue pages with this release's schema.
3. Builds and pushes the app image, then deletes the temporary branch.
4. On the VPS, `release.sh` pulls both images, migrates the live database, swaps the app and reloads Caddy.
5. Checks `<SITE_URL>/api/health`.

The running app keeps serving while the live database migrates, so each migration has to suit both the old and new release for that moment.

After the first release, verify the storefront, admin, uploads and a test checkout.

## Rollback

`release.sh` keeps the previous release's image references in `~/nies/.env.release.previous`. Check that the database schema still suits the older app, then on the VPS:

```sh
cd ~/nies
./release.sh $(sed -n 's/^[A-Z_]*=//p' .env.release.previous | tr '\n' ' ')
```

The images must still be on the VPS, or log in to `ghcr.io` first with a token that can read packages.

## Scheduled jobs

Vercel Cron does not run here. `/api/cron/abandoned-carts` also releases stock from unpaid orders, so call it every 15 minutes, either from cron-job.org or from the VPS's crontab (`crontab -e` as `deploy`):

```
*/15 * * * * curl -fsS --max-time 120 -H "Authorization: Bearer <CRON_SECRET>" https://<hostname>/api/cron/abandoned-carts >/dev/null
```
