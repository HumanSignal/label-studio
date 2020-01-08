# Building the main container
FROM python:3.6-slim
WORKDIR /app

# Copy and install requirements.txt first for caching
COPY backend/requirements.txt /app/backend/
RUN pip install -r backend/requirements.txt


ENV PORT="8200"

COPY . /app
EXPOSE ${PORT}
WORKDIR /app/backend
RUN pip install -e .
CMD ["/app/scripts/run-demo.sh", "image_bbox"]