# syntax=docker/dockerfile:1
ARG NODE_VERSION=22
ARG PYTHON_VERSION=3.13
ARG UV_VERSION=0.10.2

################################ Overview

# This Dockerfile builds a Label Studio environment.
# Build context is the SuperRepo root.
# Stages:
# 1. "uv" - Pinned uv binary.
# 2. "frontend-builder" - Compiles the frontend assets using Node.
# 3. "venv-builder" - Prepares the virtualenv environment.
# 4. "prod" - Creates the final production image with the Label Studio, Nginx, and other dependencies.

# SuperRepo workspace path (../../libs/label-studio-sdk) is patched
# via sed to match the container layout under /label-studio/.

################################ Stage: uv (pinned uv binary)
FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

################################ Stage: frontend-builder (build frontend assets)
FROM --platform=${BUILDPLATFORM} oven/bun:1.3-alpine AS frontend-builder
ENV BUILD_NO_SERVER=true \
    BUILD_NO_HASH=true \
    BUILD_NO_CHUNKS=true \
    BUILD_MODULE=true \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /label-studio/web

RUN apk add --no-cache git

COPY services/lso/web/package.json \
     services/lso/web/bun.lock \
     ./
RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-install-cache-lso,sharing=locked \
    bun install --frozen-lockfile --prefer-offline

COPY services/lso/web ./
# Target path for django-manifest-plugin → label_studio/core/static/js/manifest.json (collectstatic input).
RUN mkdir -p /label-studio/label_studio/core/static/js
COPY services/lso/pyproject.toml ../pyproject.toml
RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-install-cache-lso,sharing=locked \
    bun run build

################################ Stage: venv-builder (prepare the virtualenv)
FROM python:${PYTHON_VERSION}-alpine AS venv-builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_CACHE_DIR="/.uv-cache" \
    UV_PROJECT_ENVIRONMENT="/label-studio/.venv" \
    UV_LINK_MODE="copy" \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    PATH="/label-studio/.venv/bin:$PATH"

RUN apk add --no-cache \
    build-base \
    git \
    linux-headers \
    python3-dev \
    pcre2-dev

# Install uv
COPY --from=uv /uv /usr/local/bin/uv

WORKDIR /label-studio

# --- Phase 1: Install external dependencies (highly cacheable) ---
# Copy only manifest files — no source code. This layer is invalidated only
# when pyproject.toml or uv.lock change, preserving expensive C-extension
# builds across source edits.
COPY libs/lso-client-generator/fern/.preview/fern-python-sdk/pyproject.toml \
     libs/lso-client-generator/fern/.preview/fern-python-sdk/README.md \
     ./label-studio-sdk/
COPY services/lso/pyproject.toml services/lso/uv.lock services/lso/README.md ./

# Patch SuperRepo workspace path → container layout:
#   ../../libs/label-studio-sdk → label-studio-sdk   (in pyproject.toml + uv.lock)
RUN sed -i 's|"../../libs/label-studio-sdk"|"label-studio-sdk"|g' pyproject.toml uv.lock

ARG INCLUDE_DEV=false

# Install external deps only; skip root project and the SDK (path dep whose source isn't present yet).
RUN --mount=type=cache,target=/.uv-cache,id=uv-cache-alpine,sharing=locked \
    if [ "$INCLUDE_DEV" = "true" ]; then \
        uv sync --frozen --no-install-project --no-install-package label-studio-sdk --group test --extra uwsgi; \
    else \
        uv sync --frozen --no-install-project --no-install-package label-studio-sdk --no-dev --extra uwsgi; \
    fi

# --- Phase 2: Install project + SDK (only reruns on source changes) ---
COPY libs/lso-client-generator/fern/.preview/fern-python-sdk/src ./label-studio-sdk/src
COPY services/lso/label_studio ./label_studio

# Vite emits this path in frontend-builder; collectstatic must see it before STATIC_ROOT is populated.
COPY --from=frontend-builder /label-studio/label_studio/core/static/js/manifest.json ./label_studio/core/static/js/manifest.json
COPY --from=frontend-builder /label-studio/label_studio/core/static/js/sw.js ./label_studio/core/static/js/sw.js
COPY --from=frontend-builder /label-studio/label_studio/core/static/js/sw.js.map ./label_studio/core/static/js/sw.js.map

RUN --mount=type=cache,target=/.uv-cache,id=uv-cache-alpine,sharing=locked \
    if [ "$INCLUDE_DEV" = "true" ]; then \
        uv sync --frozen --group test --extra uwsgi; \
    else \
        uv sync --frozen --no-dev --extra uwsgi; \
    fi

# Collect static files
RUN DJANGO_SETTINGS_MODULE=core.settings.label_studio python3 ./label_studio/manage.py collectstatic --no-input

################################### Stage: prod
FROM python:${PYTHON_VERSION}-alpine AS production

ENV LS_DIR=/label-studio \
    HOME=/label-studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    OPT_DIR=/opt/heartex/instance-data/etc \
    PATH="/label-studio/.venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR $LS_DIR

# install prerequisites for app
RUN apk add --no-cache \
    expat \
    mesa-gl \
    glib \
    curl \
    nginx \
    bash \
    procps

RUN set -eux; \
    mkdir -p $LS_DIR $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR && \
    chown -R 1001:0 $LS_DIR $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR /var/log/nginx /etc/nginx

COPY --chown=1001:0 services/lso/deploy/default.conf /etc/nginx/nginx.conf

COPY --chown=1001:0 services/lso/LICENSE LICENSE
COPY --chown=1001:0 services/lso/licenses licenses
COPY --chown=1001:0 services/lso/deploy deploy

# Copy files from build stages
COPY --chown=1001:0 --from=venv-builder               /label-studio                                  $LS_DIR
COPY --chown=1001:0 --from=frontend-builder           /label-studio/web/dist                        $LS_DIR/web/dist

ARG COMMIT_VERSION=N/A
ARG COMMIT_BRANCH=N/A
ARG COMMIT_MESSAGE=N/A
ARG COMMIT_DATE=N/A
ARG COMMIT_SHA=N/A

ENV COMMIT_VERSION=${COMMIT_VERSION} \
    COMMIT_BRANCH=${COMMIT_BRANCH} \
    COMMIT_MESSAGE=${COMMIT_MESSAGE} \
    COMMIT_DATE=${COMMIT_DATE} \
    COMMIT_SHA=${COMMIT_SHA}
RUN echo "info = {'message': '${COMMIT_MESSAGE}', 'commit': '${COMMIT_SHA}', 'date': '${COMMIT_DATE}', 'branch': '${COMMIT_BRANCH}', 'version': '${COMMIT_VERSION}'}" > $LS_DIR/label_studio/core/version_.py

USER 1001

EXPOSE 8080

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["label-studio"]
