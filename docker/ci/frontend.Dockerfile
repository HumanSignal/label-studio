FROM node:20-bullseye
WORKDIR /app

# Install basic tools and build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
	git python3 build-essential && rm -rf /var/lib/apt/lists/*

# Copy whole repository into image so workspace-level installs work
COPY . /app

# Increase npm network timeout; install workspace deps at /app so nx and plugins are present
RUN npm set progress=false && npm config set fetch-timeout 600000 || true

# Install dependencies for the web workspace so Nx and plugins are available
WORKDIR /app/web
# Show web dir contents and package.json for debugging
RUN ls -la /app/web
RUN cat /app/web/package.json
# Activate corepack and prepare yarn, then install workspace dependencies (include devDependencies)
# Corepack is available in Node 18 and avoids global npm installs that can conflict in images
RUN corepack enable && corepack prepare yarn@1.22.19 --activate && \
	# Temporarily remove i18next-scanner devDependency in-image if present (it's only used for extraction)
	node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));if(p.devDependencies&&p.devDependencies['i18next-scanner']){delete p.devDependencies['i18next-scanner'];fs.writeFileSync('package.json',JSON.stringify(p,null,2))}" && \
	yarn install --frozen-lockfile --network-concurrency 1 --verbose

# Use the workspace-local nx (installed as a devDependency) by running the yarn script
# Do not set NODE_ENV=production before build so devDependencies required for build are present
RUN yarn ls:build

CMD ["/bin/sh","-c","echo Frontend build finished"]
