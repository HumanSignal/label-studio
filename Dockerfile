# syntax=docker/dockerfile:1.3
FROM node:14 AS frontend-builder

ENV NPM_CACHE_LOCATION=/root/.npm \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /label-studio/label_studio/frontend

COPY label_studio/frontend .
COPY label_studio/__init__.py /label-studio/label_studio/__init__.py

RUN --mount=type=cache,target=$NPM_CACHE_LOCATION \
    npm ci \
 && npm run build:production


FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive \
    LS_DIR=/label-studio \
    PIP_CACHE_DIR=/.cache \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    SETUPTOOLS_USE_DISTUTILS=stdlib

WORKDIR $LS_DIR

# install packages
RUN set -eux \
 && apt-get update \
 && apt-get install --no-install-recommends --no-install-suggests -y \
    build-essential postgresql-client libmysqlclient-dev mysql-client python3.8 python3-pip python3.8-dev \
    uwsgi git libxml2-dev libxslt-dev zlib1g-dev

# Copy and install middleware dependencies
COPY deploy/requirements-mw.txt .
RUN --mount=type=cache,target=$PIP_CACHE_DIR \
    pip3 install -r requirements-mw.txt

# Copy and install requirements.txt first for caching
COPY deploy/requirements.txt .
RUN --mount=type=cache,target=$PIP_CACHE_DIR \
    pip3 install -r requirements.txt

COPY . .
RUN --mount=type=cache,target=$PIP_CACHE_DIR \
    pip3 install -e .

RUN rm -rf ./label_studio/frontend
COPY --from=frontend-builder /label-studio/label_studio/frontend/dist ./label_studio/frontend/dist

RUN python3 label_studio/manage.py collectstatic --no-input

EXPOSE 8080

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["label-studio"]
