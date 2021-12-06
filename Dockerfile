# syntax=docker/dockerfile:1.3
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_CACHE_DIR=/.cache

WORKDIR /label-studio

# install packages
RUN set -eux; \
    apt-get update && apt-get install --no-install-recommends --no-install-suggests -y \
    build-essential postgresql-client libmysqlclient-dev mysql-client python3.8 python3-pip python3.8-dev \
    uwsgi git libxml2-dev libxslt-dev zlib1g-dev

RUN --mount=type=cache,target=$PIP_CACHE_DIR \
    pip3 install --upgrade pip setuptools && pip3 install uwsgi

# Copy and install requirements.txt first for caching
COPY deploy/requirements.txt /label-studio

RUN --mount=type=cache,target=$PIP_CACHE_DIR \
    pip3 install -r requirements.txt

ENV DJANGO_SETTINGS_MODULE=core.settings.label_studio
ENV LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data

COPY . /label-studio
RUN python3.8 setup.py develop

EXPOSE 8080
RUN ./deploy/prebuild_wo_frontend.sh

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["label-studio"]