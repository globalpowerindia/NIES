# Hostinger Docker setup

The VPS runs Caddy and the Next.js/Payload app on the same Docker network. Caddy publishes ports 80 and 443. The app uses port 3000 inside Docker and connects to Neon and R2. A third container runs the database migrations once per release.

## Install Docker on the VPS

On plain Ubuntu 24.04, SSH into the VPS and follow Docker's [APT repository installation steps](https://docs.docker.com/engine/install/ubuntu/#install-using-the-apt-repository) for Docker Engine, Buildx, and the Compose plugin. This setup uses Compose 2.30 or later. Verify the installation:

```sh
sudo docker compose version
sudo docker run --rm hello-world
```

Allow inbound TCP 80 and 443 in the VPS firewall. Point the staging hostname's DNS record to the VPS. This Caddyfile assumes visitors connect directly to Caddy. Use DNS-only mode if the hostname is managed by Cloudflare. A proxy in front of Caddy requires separate trusted-proxy configuration for rate limits to see the visitor's IP.

## Build the release off the VPS

Use a Linux build machine or CI runner with Docker Buildx and registry access. Set `APP_IMAGE` and `MIGRATION_IMAGE` to full image references in a private registry and tag both with the release commit. Build for the VPS architecture (`linux/amd64` below).

Create an ignored `.env.build.local` in the repository root. Use a disposable database connection for `DATABASE_URL` and a temporary `PAYLOAD_SECRET`. Include the target site's `NEXT_PUBLIC_SITE_URL`, `R2_PUBLIC_URL`, and any other public build settings it uses. The Next.js build can read database content and include it in prerendered output, so use only catalogue data suitable for publication. Build separate images when staging and production use different public settings.

```sh
docker buildx build --platform linux/amd64 --target migrator --tag "$MIGRATION_IMAGE" --push .
docker run --rm --env-file .env.build.local "$MIGRATION_IMAGE"
docker buildx build --platform linux/amd64 --no-cache-filter builder --secret id=build_env,src=.env.build.local --tag "$APP_IMAGE" --push .
```

The cache filter reruns the Next.js build when preparing a release. Docker can still reuse the dependency layer, and the build uses the current database and public settings even when only the mounted env file changed.

## Start on Hostinger

Copy this directory's `compose.yaml` and `Caddyfile` to the VPS. In that directory, create two files:

- `.env.release.local` with `SITE_DOMAIN` (the bare hostname), `APP_IMAGE`, and `MIGRATION_IMAGE` for this release.
- `.env.app.local` with this environment's app settings. Use one unquoted `KEY=value` per line and omit unused optional keys. Use the pooled Neon `DATABASE_URL`, a stable `PAYLOAD_SECRET`, the matching `NEXT_PUBLIC_SITE_URL` (with `https://`), and the R2 settings for this environment. Use separate databases, secrets, and payment credentials for staging and production. Restrict this file to the user who manages deployment (`chmod 600 .env.app.local`).

Use `sudo docker login` for the private registry on the VPS, then run these commands in order, proceeding after each succeeds:

```sh
sudo docker compose --env-file .env.release.local --profile migration pull
sudo docker compose --env-file .env.release.local run --rm migrate
sudo docker compose --env-file .env.release.local up -d
sudo docker compose --env-file .env.release.local ps
```

Check `https://<staging-hostname>/api/health` for HTTP 200, then verify the storefront, admin, uploads, and test checkout. For later releases, keep the previous image references for rollback and verify schema compatibility before rolling back the application.

This stack binds the VPS's public web ports. When switching this single VPS from staging to production, update the hostname, image references, and environment settings before starting the production deployment.
