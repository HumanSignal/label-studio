FROM python:3.7
RUN pip install uwsgi supervisor

ENV HOME=/app
COPY requirements.txt ${HOME}/
RUN pip install -r ${HOME}/requirements.txt

COPY uwsgi.ini /etc/uwsgi/
COPY supervisord.conf /etc/supervisor/conf.d/

WORKDIR ${HOME}

# RUN pip install git+https://github.com/heartexlabs/label-studio.git@master
RUN pip install label-studio

COPY . ${HOME}/

EXPOSE 9090
CMD ["supervisord"]
