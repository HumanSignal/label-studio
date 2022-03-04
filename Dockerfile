# syntax=docker/dockerfile:1.3
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_CACHE_DIR=/.cache \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    SETUPTOOLS_USE_DISTUTILS=stdlib

WORKDIR /label-studio

# install packages
RUN set -eux; \
    apt-get update && apt-get install --no-install-recommends --no-install-suggests -y \
    build-essential postgresql-client libmysqlclient-dev mysql-client python3.8 python3-pip python3.8-dev \
    uwsgi git libxml2-dev libxslt-dev zlib1g-dev

# Copy and install middleware dependencies
COPY deploy/requirements-mw.txt /label-studio
RUN --mount=type=cache,target=$PIP_CACHE_DIR \
    pip3 install -r requirements-mw.txt

# Copy and install requirements.txt first for caching
COPY deploy/requirements.txt /label-studio
RUN --mount=type=cache,target=$PIP_CACHE_DIR \
    pip3 install -r requirements.txt

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl fuse3\
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

RUN curl -o /tmp/pachctl.deb -L https://github.com/pachyderm/pachyderm/releases/download/v2.0.8/pachctl_2.0.8_amd64.deb\
 && dpkg -i /tmp/pachctl.deb

RUN mkdir /pfs
COPY deploy/init-pachyderm.sh .

COPY . /label-studio
RUN --mount=type=cache,target=$PIP_CACHE_DIR \
    pip3 install -e .

EXPOSE 8080
RUN ./deploy/prebuild_wo_frontend.sh

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["label-studio"]