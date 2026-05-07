# Local Browser Agent Gateway

This runs a local Docker-hosted Chromium browser that ChatGPT can control through an HTTP API. It can open Label Studio, return screenshots, click/type/scroll through the UI, and save a WebM recording for each session.

This does not use E2B. No E2B API key is required.

## Architecture

- `agent-gateway` is a FastAPI service running inside Docker.
- Playwright launches Chromium in the same container.
- The browser reaches your local app with `http://host.docker.internal:8082`.
- Videos are written to `tmp/agent-recordings` on the host through a bind mount.
- ChatGPT OAuth authenticates calls into the gateway. OAuth does not run the browser; the local Docker container does.

## Start Label Studio

Run the app normally. With the current dev compose setup, the public host port is `8082`:

```bash
docker compose up -d nginx-dev app-dev db-dev redis-dev rqworker-dev
```

Or use any other local/staging URL and pass it as `app_url` to `createSession`.

## Start The Agent Gateway

```bash
docker compose -f docker-compose.local-agent.yml up --build
```

The gateway listens on `http://localhost:8091` by default. Override the host port with `AGENT_GATEWAY_PORT`.

## Manual Smoke Test

```bash
curl http://localhost:8091/health

SESSION_ID=$(
  curl -s -X POST http://localhost:8091/sessions \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer dev-token' \
    -d '{"app_url":"http://host.docker.internal:8082","width":1280,"height":720}' \
  | python -c 'import json,sys; print(json.load(sys.stdin)["session_id"])'
)

curl -s "http://localhost:8091/sessions/$SESSION_ID/screenshot" \
  -H 'Authorization: Bearer dev-token' \
  | python -c 'import base64,json,sys; open("tmp/agent-screenshot.png","wb").write(base64.b64decode(json.load(sys.stdin)["image_base64"]))'

curl -s -X POST "http://localhost:8091/sessions/$SESSION_ID/stop" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer dev-token' \
  -d '{"close_browser":true}'
```

The video URL returned by `stopSession` points to the gateway static file server. The host copy is under `tmp/agent-recordings/<session_id>/`.

## ChatGPT OAuth Setup

1. Put this gateway behind HTTPS if ChatGPT will call it directly.
2. Import `openapi.yaml` as a ChatGPT Action, or wrap these same endpoints in an Apps SDK MCP server.
3. Configure OAuth in ChatGPT. ChatGPT will send `Authorization: Bearer <token>`.
4. Replace the development static bearer check with JWT/JWKS validation, or enforce OAuth token validation in an upstream reverse proxy.
5. Set `AGENT_ALLOWED_HOSTS` so the browser agent can only open your local tunnel/staging hosts.

For development without OAuth, keep `AGENT_GATEWAY_BEARER_TOKEN=dev-token` and configure the Action with Bearer/API-key auth.

## Agent Loop

1. `createSession`
2. `getScreenshot`
3. Decide the next action from the screenshot
4. `click`, `typeText`, `keypress`, `scroll`, or `navigate`
5. Repeat until complete
6. `stopSession` to close Chromium and finalize the WebM recording

## Notes

- The recording finalizes only after the browser context closes, so call `stopSession`.
- `host.docker.internal` works on Linux through `extra_hosts: host-gateway` in `docker-compose.local-agent.yml`.
- Use a seeded test account and require confirmation before destructive app actions.
