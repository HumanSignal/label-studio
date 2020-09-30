# Building the main container
FROM python:3.6-slim

WORKDIR /label-studio

# Copy and install requirements.txt first for caching
COPY requirements.txt /label-studio
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

ENV PORT="8080"
ENV PROJECT_NAME="my_project"
ENV HOST=0.0.0.0
ENV PROTOCOL=http://
# basic auth params
ENV USERNAME=""
ENV PASSWORD=""

EXPOSE ${PORT}

COPY . /label-studio

RUN python setup.py develop

CMD ["./tools/run.sh"]
