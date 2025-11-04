# Docker build fix (Node 18) — pin copy-files-from-to

## Problem
- Docker Node is 18. `web/package.json` runs `postinstall: npx -y copy-files-from-to` during `yarn install` in the frontend-builder stage.
- The latest `copy-files-from-to` pulls `yargs@18` which requires Node ≥20, causing `ERR_REQUIRE_ESM` and EBADENGINE errors under Node 18.

## Change
- Pin `copy-files-from-to@3.12.1` as a devDependency and call the local binary in scripts.
- Force `yargs@17.7.2` and `yargs-parser@21.1.1` via Yarn resolutions to prevent hoisting newer Node 20–only releases.

Files edited:
- `web/package.json`
  - scripts.postinstall → `copy-files-from-to` (no npx)
  - husky.hooks.post-checkout → `copy-files-from-to` (no npx)
  - devDependencies: add `copy-files-from-to@3.12.1`
  - resolutions: add `yargs@17.7.2`, `yargs-parser@21.1.1`

## Verification
1. In repo root:
   - `cd web && yarn install` (should run postinstall successfully on Node 18)
2. Docker build (from repo root):
   - `docker build -f Dockerfile .`
   - `docker build -f Dockerfile.development .`
   - Both should pass the `frontend-builder` yarn install step.

## Rollback
- If issues persist, options:
  - Revert these edits and upgrade Docker `NODE_VERSION` to 20.
  - Or pin an earlier `copy-files-from-to` release known to work in your env.

## Context
This keeps current Dockerfiles and the rest of the stack unchanged while restoring deterministic installs under Node 18.


