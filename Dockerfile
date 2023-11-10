# syntax=docker/dockerfile:1.3
FROM node:18 AS frontend-builder

ENV NPM_CACHE_LOCATION=$HOME/.cache/yarn/v6 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /label-studio/label_studio/frontend

COPY --chown=1001:0 label_studio/frontend .
COPY --chown=1001:0 label_studio/__init__.py /label-studio/label_studio/__init__.py

# Fix Docker Arm64 Build
RUN yarn config set registry https://registry.npmjs.org/
RUN yarn config set network-timeout 1200000 # HTTP timeout used when downloading packages, set to 20 minutes

RUN --mount=type=cache,target=$NPM_CACHE_LOCATION,uid=1001,gid=0 \
    yarn install --frozen-lockfile \
 && yarn run build:production

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    LS_DIR=/label-studio \
    PIP_CACHE_DIR=$HOME/.cache \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    OPT_DIR=/opt/heartex/instance-data/etc \
    SETUPTOOLS_USE_DISTUTILS=stdlib

WORKDIR $LS_DIR

# install packages
RUN set -eux \
 && apt-get update \
 && apt-get install --no-install-recommends --no-install-suggests -y \
    build-essential postgresql-client libmysqlclient-dev mysql-client python3-pip python3-dev \
    git libxml2-dev libxslt-dev zlib1g-dev gnupg curl lsb-release libpq-dev dnsutils vim rsync && \
    apt-get purge --assume-yes --auto-remove --option APT::AutoRemove::RecommendsImportant=false \
     --option APT::AutoRemove::SuggestsImportant=false && rm -rf /var/lib/apt/lists/* /tmp/*

RUN --mount=type=cache,target=$PIP_CACHE_DIR,uid=1001,gid=0 \
    pip3 install --upgrade pip setuptools && pip3 install poetry uwsgi uwsgitop

# incapsulate nginx install & configure to a single layer
RUN set -eux; \
    curl -sSL https://nginx.org/keys/nginx_signing.key | apt-key add - && \
    echo "deb https://nginx.org/packages/mainline/ubuntu/ $(lsb_release -cs) nginx" >> /etc/apt/sources.list && \
    apt-get update && apt-get install -y nginx && \
    apt-get purge --assume-yes --auto-remove --option APT::AutoRemove::RecommendsImportant=false \
     --option APT::AutoRemove::SuggestsImportant=false && rm -rf /var/lib/apt/lists/* /tmp/* && \
    nginx -v

COPY --chown=1001:0 deploy/default.conf /etc/nginx/nginx.conf

RUN set -eux; \
    mkdir -p $OPT_DIR /var/log/nginx /var/cache/nginx /etc/nginx && \
    chown -R 1001:0 $OPT_DIR /var/log/nginx /var/cache/nginx /etc/nginx

# files required by PDM
COPY --chown=1001:0 ./pyproject.toml $LS_DIR
COPY --chown=1001:0 ./poetry.lock $LS_DIR
COPY --chown=1001:0 ./README.md $LS_DIR

COPY --chown=1001:0 . .

# Install the dependencies from the pdm lockfile, to the __pypackages__ folder
# as well as the label-studio script from pyproject.toml
#   --check causes a failure if the lockfile is out of date
RUN poetry check --lock && POETRY_VIRTUALENVS_CREATE=false poetry install

# Approach inspired by https://pdm-project.org/latest/usage/advanced/#use-pdm-in-a-multi-stage-dockerfile
# Move the packages + binary installed by pdm to the folders where pip would install them
# Then clean up __pypackages__
# RUN rsync -a $LS_DIR/__pypackages__/3.10/lib/ /usr/local/lib/python3.10/dist-packages
# RUN mv $LS_DIR/__pypackages__/3.10/bin/label-studio /usr/local/bin/
# RUN rm -rf $LS_DIR/__pypackages__

RUN rm -rf ./label_studio/frontend
COPY --chown=1001:0 --from=frontend-builder /label-studio/label_studio/frontend/dist ./label_studio/frontend/dist

RUN python3 label_studio/manage.py collectstatic --no-input && \
    chown -R 1001:0 $LS_DIR && \
    chmod -R g=u $LS_DIR

ENV HOME=/label-studio

EXPOSE 8080

USER 1001

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["label-studio"]
