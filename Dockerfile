# Building the main container
FROM python:3.6-slim
WORKDIR /app

# Copy and install requirements.txt first for caching
COPY backend/requirements.txt /app/backend/
RUN pip install -r backend/requirements.txt

COPY . /app
EXPOSE ${PORT:-8200}
WORKDIR /app/backend
CMD ["/app/scripts/run-demo.sh", "image_bbox", "$PORT"]