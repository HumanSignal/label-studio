# Building the main container
FROM ubuntu:20.04

WORKDIR /label-studio

# Copy and install requirements.txt first for caching
COPY deploy/requirements.txt /label-studio

ENV TZ=Europe/Berlin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt-get update && apt-get install -y build-essential postgresql-client python3.8 python3-pip python3.8-dev uwsgi  git libxml2-dev libxslt-dev zlib1g-dev uwsgi

RUN chgrp -R 0 /var/log /var/cache /var/run /run /tmp /etc/uwsgi && \
    chmod -R g+rwX /var/log /var/cache /var/run /run /tmp /etc/uwsgi

RUN pip3 install --upgrade pip
RUN pip3 install -r requirements.txt && pip install uwsgi

ENV DJANGO_SETTINGS_MODULE=core.settings.label_studio
ENV LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data
ENV LABEL_STUDIO_PORT="8080"

COPY . /label-studio
RUN python3.8 setup.py develop

EXPOSE ${LABEL_STUDIO_PORT}

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD bash /label-studio/deploy/start_label_studio.sh
