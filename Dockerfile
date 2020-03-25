# Building the main container
FROM python:3.6-slim

WORKDIR /label-studio

# Copy and install requirements.txt first for caching
COPY requirements.txt /label-studio
RUN pip install -r requirements.txt

ENV PORT="8080"
ENV collect_analytics=0
EXPOSE ${PORT}

COPY . /label-studio

RUN pip install -e .
CMD ["label-studio", "start", "my_project", "--init", "--no-browser", "--port", "8080"]
