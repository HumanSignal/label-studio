# syntax=docker/dockerfile:1.3
FROM registry.access.redhat.com/ubi8/nodejs-18-minimal AS frontend-builder

ENV NPM_CACHE_LOCATION=$HOME/.cache/yarn/v6 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /label-studio/label_studio/frontend

COPY --chown=1001:0 label_studio/frontend .
COPY --chown=1001:0 pyproject.toml /label-studio

RUN --mount=type=cache,target=$NPM_CACHE_LOCATION,uid=1001,gid=0 \
    npm install -g yarn

RUN --mount=type=cache,target=$NPM_CACHE_LOCATION,uid=1001,gid=0 \
    yarn install --frozen-lockfile \
 && yarn run build:production

FROM registry.access.redhat.com/ubi8/python-39

ENV LS_DIR=/label-studio \
    PIP_CACHE_DIR=$HOME/.cache \
    POETRY_CACHE_DIR=$HOME/.poetry-cache \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    OPT_DIR=/opt/heartex/instance-data/etc \
    SETUPTOOLS_USE_DISTUTILS=stdlib

USER 0
RUN dnf module enable -y nginx:1.20 && \
    dnf -y install nginx && \
    mkdir -p $OPT_DIR && \
    chown -R 1001:0 $OPT_DIR /etc/nginx/nginx.conf && \
    chmod -R g=u $OPT_DIR /etc/nginx/nginx.conf
USER 1001

WORKDIR $LS_DIR

RUN --mount=type=cache,target=$PIP_CACHE_DIR,uid=1001,gid=0 \
    pip3 install poetry uwsgi uwsgitop

# Copy essential files for installing Label Studio and its dependencies
COPY --chown=1001:0 pyproject.toml .
COPY --chown=1001:0 poetry.lock .
COPY --chown=1001:0 README.md .
COPY --chown=1001:0 label_studio/__init__.py ./label_studio/__init__.py

# Ensure the poetry lockfile is up to date, then install all deps from it to
# the system python. This includes label-studio itself. For caching purposes,
# do this before copying the rest of the source code.
RUN --mount=type=cache,target=$POETRY_CACHE_DIR,uid=1001,gid=0 \
    poetry check --lock && POETRY_VIRTUALENVS_CREATE=false poetry install

COPY --chown=1001:0 . .

RUN rm -rf ./label_studio/frontend
COPY --chown=1001:0 --from=frontend-builder /label-studio/label_studio/frontend/dist ./label_studio/frontend/dist

RUN python3 label_studio/manage.py collectstatic --no-input

EXPOSE 8080

LABEL name="LabelStudio" \
  maintainer="infra@heartex.com" \
  vendor="Heartex" \
  version="1.5.0dev" \
  release="1" \
  summary="LabelStudio" \
  description="Label Studio is an open source data labeling tool."

COPY --chown=1001:0 licenses/ /licenses
RUN cp $LS_DIR/LICENSE /licenses
ENV HOME=/label-studio

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["label-studio"]
