# MIB Deployment

This directory owns the production-style configuration for the MIB app at
`https://mib.biowork.app`.

## Files

- `.env` - production runtime secrets and deployment values; ignored by git
- `.env.dev` - local development runtime values; ignored by git
- `.env.example` - generic template (backward-compatible)
- `.env.prod.example` - production template
- `.env.dev.example` - local development template
- `cloudflare/config.yml` - committed Cloudflare Tunnel ingress config
- `cloudflare/credentials.json` - local tunnel credentials; ignored by git

## Setup

Create separate env files once:

```bash
cp deploy/apps/mib/.env.prod.example deploy/apps/mib/.env
cp deploy/apps/mib/.env.dev.example deploy/apps/mib/.env.dev
```

Fill secrets in both files as needed.

- `deploy/apps/mib/.env` is for production-like runs (`mib.biowork.app`)
- `deploy/apps/mib/.env.dev` is for local development (`localhost`) and has:
  - `TURNSTILE_ENABLED=false`
  - `SESSION_COOKIE_SECURE=0`
  - `CSRF_COOKIE_SECURE=0`
  - local host URLs to avoid redirects to production

Create tunnel credentials from a Cloudflare tunnel token:

```bash
deploy/apps/mib/cloudflare/setup-credentials.sh <cloudflare-tunnel-token>
```

## Workflow

Use native Docker Compose with a dev-default base file and a prod override file.

### Local dev (no Turnstile, localhost host/cookies)

```bash
docker compose -f docker-compose.mib.yml build
docker compose -f docker-compose.mib.yml up -d --force-recreate
docker compose -f docker-compose.mib.yml exec -T app python label_studio/manage.py migrate
docker compose -f docker-compose.mib.yml ps
```

### Production-like (prod env + tunnel profile)

```bash
docker compose -f docker-compose.mib.yml -f docker-compose.mib.prod.yml --profile prod build
docker compose -f docker-compose.mib.yml -f docker-compose.mib.prod.yml --profile prod up -d --force-recreate
docker compose -f docker-compose.mib.yml -f docker-compose.mib.prod.yml --profile prod exec -T app python label_studio/manage.py migrate
docker compose -f docker-compose.mib.yml -f docker-compose.mib.prod.yml --profile prod ps
```

## Notes

The base dev file binds nginx to `127.0.0.1:8080/8081`. Public exposure should
go through the `cloudflared` service in the prod-profile workflow.
