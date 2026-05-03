# MIB Deployment

This directory owns the production-style configuration for the MIB app at
`https://mib.biowork.app`.

## Files

- `.env` - local runtime secrets and deployment values; ignored by git
- `.env.example` - committed template for `.env`
- `cloudflare/config.yml` - committed Cloudflare Tunnel ingress config
- `cloudflare/credentials.json` - local tunnel credentials; ignored by git

## Setup

Create the local env file:

```bash
cp deploy/apps/mib/.env.example deploy/apps/mib/.env
```

Fill in the secret values in `deploy/apps/mib/.env`, especially database,
Turnstile, and Stripe values.

Create tunnel credentials from a Cloudflare tunnel token:

```bash
deploy/apps/mib/cloudflare/setup-credentials.sh <cloudflare-tunnel-token>
```

Start or update the stack:

```bash
docker compose --env-file deploy/apps/mib/.env -f docker-compose.mib.yml up -d
```

Check it:

```bash
docker compose -f docker-compose.mib.yml ps
curl -I http://localhost:8080/nginx_health
curl -I https://mib.biowork.app
```

## Notes

The compose file binds nginx to `127.0.0.1` by default so the public path is
Cloudflare Tunnel, not direct origin access. Override `MIB_HTTP_BIND` only when
direct host access is intentional.
