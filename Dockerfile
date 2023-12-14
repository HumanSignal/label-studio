# syntax=docker/dockerfile:1
ARG NODE_VERSION=18
ARG PYTHON_VERSION=3.10
ARG POETRY_VERSION=1.7.1
ARG GOSU_VERSION=1.17

################################ Overview

# This Dockerfile builds a Label Studio environment.
# It consists of three main stages:
# 1. "frontend-builder" - Compiles the frontend assets using Node.
# 2. "wheel-builder" - Prepares the final wheel package.
# 3. "final" - Creates the final production image with the Label Studio wheel, Nginx, and other dependencies.

################################ Stage: frontend-builder (build frontend assets)

FROM --platform=${BUILDPLATFORM} node:${NODE_VERSION} AS frontend-builder

ENV NPM_CACHE_LOCATION=$HOME/.cache/yarn/v6 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NX_REJECT_UNKNOWN_LOCAL_CACHE=0

WORKDIR /label-studio/web

COPY web .
COPY pyproject.toml /label-studio

# Setup Node and Yarn configurations and build frontend
RUN --mount=type=cache,target="/root/.cache",sharing=locked \
    set -xeuo pipefail; \
    yarn config set registry https://registry.npmjs.org/; \
    yarn config set network-timeout 1200000; \
    yarn install --frozen-lockfile; \
    yarn run build

################################ Stage: wheel-builder (prepare final wheel package)

FROM python:${PYTHON_VERSION}-slim AS wheel-builder

# Install Poetry
ARG POETRY_HOME=/opt/poetry
ARG POETRY_INSTALLER_PARALLEL=true
ARG POETRY_VIRTUALENVS_CREATE=false
ARG POETRY_VERSION
RUN --mount=type=cache,target="/root/.cache",sharing=locked \
    pip install poetry==${POETRY_VERSION}

# Add poetry install location to the $PATH
ENV PATH="${POETRY_HOME}/bin:${PATH}"

RUN poetry config virtualenvs.create ${POETRY_VIRTUALENVS_CREATE} && \
    poetry config installer.parallel "${POETRY_INSTALLER_PARALLEL}" && \
    poetry config installer.no-binary pyuwsgi

WORKDIR /label-studio

RUN --mount=type=cache,target="/var/cache/apt",sharing=locked \
    --mount=type=cache,target="/var/lib/apt/lists",sharing=locked \
    set -xeuo pipefail; \
    apt-get update; \
    apt-get upgrade -y; \
    apt-get install --no-install-recommends -y ca-certificates curl gnupg libxml2 gcc python3-dev; \
    apt-get autoremove -y

# Copy project files
COPY pyproject.toml poetry.lock README.md ./
COPY label_studio/__init__.py ./label_studio/__init__.py

# Install dependencies
RUN --mount=type=cache,target="/root/.cache",sharing=locked \
    poetry install --no-ansi && \
    rm -rf /tmp/tmp*

# Copy the source code
COPY . .

# Copy compiled frontend assets from the frontend-builder stage
RUN rm -rf ./label_studio/web
COPY --from=frontend-builder /label-studio/web/dist ./label_studio/web/dist
## Collect static files
RUN --mount=type=cache,target="/root/.cache",sharing=locked \
    poetry run python label_studio/manage.py collectstatic --no-input \
    && poetry build -f wheel

################################ Stage: final (production-ready image)

FROM python:${PYTHON_VERSION}-slim
ARG GOSU_VERSION
ENV DEBIAN_FRONTEND=noninteractive \
    LS_DIR=/label-studio \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    OPT_DIR=/opt/heartex/instance-data/etc

WORKDIR $LS_DIR

# add our user and group first to make sure their IDs get assigned consistently, regardless of whatever dependencies get added
RUN set -xeuo pipefail; \
	groupadd --gid 1001 --system label-studio; \
	useradd --uid 1001 --system --gid label-studio --home-dir /label-studio label-studio; \
	mkdir -p $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR; \
	chown -R label-studio:label-studio $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR

# incapsulate nginx install & configure to a single layer
RUN --mount=type=cache,target="/var/cache/apt",sharing=locked \
    --mount=type=cache,target="/var/lib/apt/lists",sharing=locked \
    set -xeuo pipefail; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates gnupg wget; \
    wget -q https://nginx.org/keys/nginx_signing.key -O- | apt-key add -; \
    CODENAME=$(grep 'VERSION_CODENAME=' /etc/os-release | cut -d"=" -f2 | xargs); \
    echo "deb https://nginx.org/packages/mainline/debian/ ${CODENAME} nginx" >> /etc/apt/sources.list; \
    apt-get update && apt-get install -y nginx; \
    apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
    nginx -v; \
    usermod -a -G tty nobody; \
    usermod -a -G tty nginx

# Install gosu
RUN --mount=type=cache,target="/var/cache/apt",sharing=locked \
    --mount=type=cache,target="/var/lib/apt/lists",sharing=locked \
    set -xeuo pipefail; \
	savedAptMark="$(apt-mark showmanual)"; \
	apt-get update; \
	apt-get install -y --no-install-recommends ca-certificates gnupg wget; \
	dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')"; \
	wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch"; \
	wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch.asc"; \
	export GNUPGHOME="$(mktemp -d)"; \
	gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4; \
	gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu; \
	gpgconf --kill all; \
	rm -rf "$GNUPGHOME" /usr/local/bin/gosu.asc; \
	apt-mark auto '.*' > /dev/null; \
	[ -z "$savedAptMark" ] || apt-mark manual $savedAptMark > /dev/null; \
	apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
	chmod +x /usr/local/bin/gosu; \
	gosu --version; \
	gosu nobody true

# Copy docker-entrypoint scripts
COPY deploy/ ./deploy/
COPY deploy/default.conf /etc/nginx/nginx.conf

# Copy final wheel package and frontend assets from the wheel-builder stage
COPY --from=wheel-builder /label-studio/dist/*.whl /label-studio/dist/

# Install Label Studio wheel
RUN --mount=type=cache,target="/root/.cache",sharing=locked \
    set -xeuo pipefail; \
    pip install /label-studio/dist/*.whl; \
    ln -s /usr/local/lib/python$(python3 --version | cut -d ' ' -f 2 | cut -d '.' -f 1,2)/site-packages/label_studio /label-studio; \
    rm -rf /label-studio/dist

VOLUME $LABEL_STUDIO_BASE_DATA_DIR
ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["label-studio"]