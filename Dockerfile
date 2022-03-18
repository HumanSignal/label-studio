# syntax=docker/dockerfile:1.3
FROM node:14 AS builder

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true \
    PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium

WORKDIR /app/label_studio/frontend

RUN set -eux \
 && apt-get update \
 && apt-get install --no-install-recommends --no-install-suggests -y \
    chromium fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1

COPY label_studio/frontend .
COPY label_studio/__init__.py /app/label_studio/__init__.py

RUN --mount=type=cache,target=/root/.npm \
    npm ci \
 && npm run build:production


FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_CACHE_DIR=/.cache \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    SETUPTOOLS_USE_DISTUTILS=stdlib

WORKDIR /label-studio

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
COPY --from=builder /app/label_studio/frontend/dist ./label_studio/frontend/dist

RUN python3 label_studio/manage.py collectstatic --no-input
RUN python3 label_studio/core/version.py

EXPOSE 8080

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["label-studio"]
