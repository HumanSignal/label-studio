# Building the main container
FROM ubuntu:20.04

WORKDIR /label-studio
EXPOSE 8080

ENV TZ=Europe/Berlin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt-get update && apt-get install -y build-essential postgresql-client python3.8 python3-pip python3.8-dev uwsgi  git libxml2-dev libxslt-dev zlib1g-dev

# Copy and install requirements.txt first for caching
COPY deploy/requirements.txt /label-studio
COPY deploy/uwsgi.ini /label-studio
COPY wait-for-it.sh /label-studio

RUN pip3 install --upgrade pip
RUN pip3 install -r requirements.txt

ENV DJANGO_SETTINGS_MODULE=core.settings.label_studio
# ENV BASE_DATA_DIR=/label-studio/

COPY . /label-studio
RUN python3.8 setup.py develop
RUN cd label_studio && python3.8 manage.py migrate
RUN cd label_studio && python3.8 manage.py collectstatic --no-input -v 0
CMD [ "label-studio" ]
