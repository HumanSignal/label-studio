# syntax=docker/dockerfile:1
ARG ROCKY_VERSION=10.3
ARG PYTHON_VERSION=3.14
ARG UV_VERSION=0.13
ARG BUN_VERSION=1.3

################################ Overview
# Label Studio (open source) image. Build context: the repository root.
# Stages:
#   uv                pinned uv binary
#   frontend-builder  frontend assets (Bun, Debian; only its output is copied)
#   venv-builder      Python venv and static files (Rocky)
#   rootfs            runtime OS packages in an empty root (Rocky)
#   production        FROM scratch: rootfs + app
#
# label-studio-sdk is a git-pinned dependency in pyproject.toml/uv.lock
# (maintained by the monorepo sync); uv fetches it during the build.

################################ Stage: uv
FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

################################ Stage: frontend-builder
FROM --platform=${BUILDPLATFORM} oven/bun:${BUN_VERSION}-slim AS frontend-builder
ENV BUILD_NO_SERVER=true \
    BUILD_NO_HASH=true \
    BUILD_NO_CHUNKS=true \
    BUILD_MODULE=true \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /label-studio/web

RUN apt-get update && \
    apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY web/package.json \
     web/bun.lock \
     ./
RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-install-cache-lso,sharing=locked \
    bun install --frozen-lockfile --prefer-offline

COPY web ./
# Target path for django-manifest-plugin → label_studio/core/static/js/manifest.json (collectstatic input).
RUN mkdir -p /label-studio/label_studio/core/static/js
COPY pyproject.toml ../pyproject.toml
# Builds only (vite), installs nothing: no cache mount needed.
RUN bun run build

################################ Stage: venv-builder
FROM rockylinux/rockylinux:${ROCKY_VERSION}-minimal AS venv-builder
ARG PYTHON_VERSION

# Python comes from uv (Rocky 10 has only 3.12). Production copies /opt/python to the
# same path so the venv's interpreter symlinks resolve.
# Every LSO dependency ships a manylinux wheel or is pure Python, so no compiler.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_CACHE_DIR="/.uv-cache" \
    UV_PROJECT_ENVIRONMENT="/label-studio/.venv" \
    UV_LINK_MODE="copy" \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_INSTALL_DIR=/opt/python \
    UV_PYTHON_PREFERENCE=only-managed \
    PATH="/label-studio/.venv/bin:$PATH"

# git-core: uv fetches the git-pinned label-studio-sdk.
RUN microdnf install -y --setopt=install_weak_deps=0 git-core && \
    microdnf clean all

COPY --from=uv /uv /usr/local/bin/uv
# Drop the bundled pip: unused, and its vendored packages trip scanners.
RUN uv python install ${PYTHON_VERSION} && \
    rm -rf /opt/python/*/lib/python3*/site-packages/pip /opt/python/*/lib/python3*/site-packages/pip-* \
           /opt/python/*/bin/pip* && \
    ln -s "$(uv python find ${PYTHON_VERSION})" /usr/local/bin/python3

WORKDIR /label-studio

# Phase 1: deps from manifests only, cached until pyproject/uv.lock change.
COPY pyproject.toml uv.lock README.md ./

ARG INCLUDE_DEV=false
# Per-arch uv cache.
ARG TARGETARCH

RUN --mount=type=cache,target=/.uv-cache,id=uv-cache-lso-rocky-${TARGETARCH},sharing=shared \
    if [ "$INCLUDE_DEV" = "true" ]; then \
        uv sync --frozen --no-install-project --group test --extra uwsgi; \
    else \
        uv sync --frozen --no-install-project --no-dev --extra uwsgi; \
    fi

# Phase 2: the project.
COPY label_studio ./label_studio

# Vite emits these in frontend-builder; collectstatic must see them before STATIC_ROOT is populated.
COPY --from=frontend-builder /label-studio/label_studio/core/static/js/manifest.json ./label_studio/core/static/js/manifest.json
COPY --from=frontend-builder /label-studio/label_studio/core/static/js/sw.js ./label_studio/core/static/js/sw.js
COPY --from=frontend-builder /label-studio/label_studio/core/static/js/sw.js.map ./label_studio/core/static/js/sw.js.map

RUN --mount=type=cache,target=/.uv-cache,id=uv-cache-lso-rocky-${TARGETARCH},sharing=shared \
    if [ "$INCLUDE_DEV" = "true" ]; then \
        uv sync --frozen --group test --extra uwsgi; \
    else \
        uv sync --frozen --no-dev --extra uwsgi; \
    fi

RUN DJANGO_SETTINGS_MODULE=core.settings.label_studio python3 ./label_studio/manage.py collectstatic --no-input

# Drop third-party test suites. Runtime modules such as django.test and numpy.testing stay.
RUN cd .venv/lib/python3*/site-packages && \
    find . -mindepth 2 -type d -name tests -prune -exec rm -rf {} + && \
    rm -rf Cryptodome/SelfTest joblib/test sniffio/_tests test testing


################################### Stage: rootfs
# Runtime packages in an empty root: no package manager ships, and its own rpmdb
# lets scanners see every package.
# - nginx: nginx.org mainline (AppStream has only 1.26).
# - libstdc++: wheels. expat: the pyuwsgi wheel links libexpat. tzdata: Python zoneinfo.
# - bash, coreutils, findutils, gawk, sed: entrypoint scripts.
# - grep: debugging in a running container.
# - wget: outgoing healthchecks.
# microdnf --installroot needs the explicit config/cache/repo options and the dnf vars
# inside the root; releasever is the major, so packages track Rocky's current minor.
# The erase list drops what nothing at runtime uses: nginx.org's systemd, procps and
# shadow-utils requirements with their dependencies, PAM, repo files and docs.
# Only installed names are erased, since the set pulled in varies with the package list.
# rocky-release stays for /etc/os-release.
FROM rockylinux/rockylinux:${ROCKY_VERSION}-minimal AS rootfs
ARG ROCKY_VERSION
RUN printf '%s\n' \
        '[nginx-mainline]' \
        'name=nginx mainline repo' \
        "baseurl=https://nginx.org/packages/mainline/centos/${ROCKY_VERSION%%.*}/\$basearch/" \
        'gpgcheck=1' \
        'enabled=1' \
        'gpgkey=https://nginx.org/keys/nginx_signing.key' \
        'module_hotfixes=true' \
        > /etc/yum.repos.d/nginx.repo && \
    mkdir -p /rootfs/etc/dnf && \
    cp -r /etc/dnf/vars /rootfs/etc/dnf/vars && \
    microdnf install -y \
        --installroot=/rootfs \
        --releasever=${ROCKY_VERSION%%.*} \
        --config=/etc/dnf/dnf.conf \
        --noplugins \
        --setopt=cachedir=/var/cache/rootfs-dnf \
        --setopt=reposdir=/etc/yum.repos.d \
        --setopt=varsdir=/etc/dnf/vars \
        --setopt=install_weak_deps=0 \
        --nodocs \
        bash \
        ca-certificates \
        coreutils-single \
        expat \
        findutils \
        gawk \
        glibc-minimal-langpack \
        grep \
        libstdc++ \
        nginx \
        sed \
        tzdata \
        wget && \
    erase=$(rpm --root=/rootfs -q --qf '%{NAME}\n' \
        alternatives \
        audit-libs \
        bzip2-libs \
        dbus \
        dbus-broker \
        dbus-common \
        libblkid \
        libcap-ng \
        libeconf \
        libfdisk \
        libmount \
        libseccomp \
        libsemanage \
        libsmartcols \
        pam-libs \
        pcre2-syntax \
        procps-ng \
        rocky-gpg-keys \
        rocky-repos \
        shadow-utils \
        systemd \
        systemd-libs \
        systemd-pam \
        util-linux-core | grep -v 'is not installed') && \
    rpm --root=/rootfs -e --nodeps --noscripts $erase && \
    rm -rf /rootfs/etc/dnf /rootfs/var/lib/dnf /rootfs/var/cache/* /rootfs/var/log/dnf* \
        /rootfs/etc/systemd /rootfs/usr/lib/systemd /rootfs/etc/machine-id \
        /rootfs/usr/lib64/security/pam_cap.so

################################### Stage: production
FROM scratch AS production
COPY --from=rootfs /rootfs /

ENV LS_DIR=/label-studio \
    HOME=/label-studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    OPT_DIR=/opt/heartex/instance-data/etc \
    PATH="/label-studio/.venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LANG=C.UTF-8

# Python the venv's interpreter symlinks point at
COPY --from=venv-builder /opt/python /opt/python

# OpenShift arbitrary UID support
RUN chmod g=u /etc/passwd /var/run && \
    mkdir -p $LS_DIR $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR && \
    chown -R 1001:0 $LS_DIR $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR /var/log/nginx /etc/nginx && \
    chmod -R g=u $LS_DIR $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR /var/log/nginx /etc/nginx

WORKDIR $LS_DIR

COPY --chown=1001:0 deploy/default.conf /etc/nginx/nginx.conf

COPY --chown=1001:0 LICENSE LICENSE
COPY --chown=1001:0 licenses licenses
COPY --chown=1001:0 deploy deploy

# venv and app code (large layer), then frontend
COPY --chown=1001:0 --from=venv-builder     /label-studio          $LS_DIR
COPY --chown=1001:0 --from=frontend-builder /label-studio/web/dist $LS_DIR/web/dist

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
