# Building the frontend
FROM node:10 AS build
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package*.json ./
USER node
RUN npm install
COPY --chown=node:node . .
RUN npm run publish


# Building the main container
FROM python:3.6-slim
WORKDIR /app

# Copy and install requirements.txt first for caching
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir --trusted-host pypi.python.org -r backend/requirements.txt

COPY . /app
COPY --from=build /home/node/app/build/ /app/build
EXPOSE 8200
WORKDIR /app/backend
ENTRYPOINT ["python", "server.py"]