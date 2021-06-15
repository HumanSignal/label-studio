---
title: Install Label Studio Enterprise on-premises using Docker
badge: <i class='ent'/></i>
type: guide
order: 201
meta_title: Install Label Studio Enterprise on-premises using Docker
meta_description: Install, back up, and upgrade Label Studio Enterprise with Docker to create machine learning and data science projects on-premises.
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

Install Label Studio Enterprise on-premises if you need to meet strong privacy regulations, legal requirements, or want to manage a custom installation on your own infrastructure using Docker or public cloud. To deploy Label Studio Enterprise on Amazon AWS in a Virtual Private Cloud (VPC), see [Install Label Studio Enterprise on AWS Private Cloud](install_enterprise_vpc.html). 

You can run Label Studio Enterprise in an airgapped environment, and no data leaves your infrastructure. See [Secure Label Studio](security.html) for more details about security and hardening for Label Studio Enterprise.

<div class="enterprise"><p>
To install Label Studio Community Edition, see <a href="install.html">Install and Upgrade Label Studio</a>. This page is specific to the Enterprise version of Label Studio.
</p></div>

<!-- md deploy.md -->

## Install Label Studio Enterprise using Docker

1. Pull the latest image
2. Add the license file
3. Start using Docker. To start the server in development mode, start using Docker Compose. 

### Prerequisites
Make sure you have an authorization token to retrieve Docker images and a current license file. If you are a Label Studio Enterprise customer and do not have access, [contact us](mailto:hello@heartex.ai) to receive an authorization token and a copy of your license file.

### Pull the latest image

You must be authorized to use Label Studio Enterprise images. 

1. Set up the Docker login to retrieve the latest Docker image:
```bash
docker login --username heartexlabs
```
When prompted to enter the password, enter the token here. If Login Succeeded, a `~/.docker/config.json` file is created with the authorization settings.   
2. Pull the latest Label Studio Enterprise image:
```bash
docker pull heartexlabs/heartex:latest
```

> Note: In some cases, you might need to use `sudo` to log in or pull images.

### Add the license file 
After you retrieve the latest Label Studio Enterprise image, add the license file. You can't start the Docker image without a license file. 

1. Create a working directory called `heartex` and place the license file in it.
```bash
mkdir -p heartex
cd heartex
```
2. Move the license file, `license.txt`, to the `heartex` directory.

### Start using Docker

To run Label Studio Enterprise in production, start it using Docker. This configuration allows you to link Label Studio with external databases and services.

1. Create a file, `heartex/env.list` with the required environmental variables:
```
# The main server URL (must be a full path like protocol://host:port)
HEARTEX_HOSTNAME=http://localhost:8080

# Auxiliary hostname URL: some platform functionality requires URIs generation with specified hostname, 
# in case HEARTEX_HOSTNAME is not accessible from server side, use this variable to specify server host
HEARTEX_INTERNAL_HOSTNAME=

# PostgreSQL database name
POSTGRE_NAME=postgres

# PostgreSQL database user
POSTGRE_USER=postgres

# PostgreSQL database password
POSTGRE_PASSWORD=

# PostgreSQL database host
POSTGRE_HOST=db

# PostgreSQL database port
POSTGRE_PORT=5432

# PostgreSQL SSL mode
POSTGRE_SSL_MODE=require

# Specify Postgre SSL certificate
POSTGRE_SSLROOTCERT=postgre-ca-bundle.pem

# Redis location e.g. redis://[:password]@localhost:6379/1
REDIS_LOCATION=localhost:6379

# Redis database
REDIS_DB=1

# Redis password
REDIS_PASSWORD=12345

# Redis socket timeout
REDIS_SOCKET_TIMEOUT=3600

# Use Redis SSL connection
REDIS_SSL=1

# Require certificate
REDIS_SSL_CERTS_REQS=required

# Specify Redis SSL certificate
REDIS_SSL_CA_CERTS=redis-ca-bundle.pem
```

2. After you set all the environment variables, run Docker exposing port 8080:

```bash
docker run -d \
-p 8080:8080 \
--env-file env.list \
-v `pwd`/license.txt:/heartex/web/htx/settings/license_docker.txt \
-v `pwd`/logs:/var/log/heartex \
-v `pwd`/postgre-ca-bundle.pem:/etc/ssl/certs/postgre-ca-bundle.pem \
-v `pwd`/redis-ca-bundle.pem:/etc/ssl/certs/redis-ca-bundle.pem \
--name heartex \
heartexlabs/heartex:latest
```

> Note: If you expose port 80, you must start Docker with `sudo`.

### Start using Docker Compose

To run Label Studio Enterprise in development mode, start Label Studio using Docker Compose and local PostgreSQL and Redis servers to store data and configurations. 

> Follow these instructions only if you plan to use Label Studio Enterprise in development mode. Otherwise, see [Start Using Docker](#Start-using-Docker) on this page.

#### Prerequisites
Make sure [Docker Compose](https://docs.docker.com/compose/install/) is installed on your system.

#### Start Label Studio Enterprise in development mode

1. Create a configuration file `heartex/config.yml` with the following content:

```yaml
version: '3'

services:
  db:
    image: postgres:11.5
    hostname: db
    restart: always
    environment:
      - POSTGRES_HOST_AUTH_METHOD=trust
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
      - ./logs:/var/log/heartex
    ports:
      - 5432:5432
  heartex:
    image: heartexlabs/heartex:latest
    container_name: heartex
    volumes:
      - ./license.txt:/heartex/web/htx/settings/license_docker.txt
    environment:
      - HEARTEX_HOSTNAME=http://localhost:8080
      - POSTGRE_NAME=postgres
      - POSTGRE_USER=postgres
      - POSTGRE_PASSWORD=
      - POSTGRE_PORT=5432
      - POSTGRE_HOST=db
      - REDIS_LOCATION=redis:6379
    command: ["./deploy/wait-for-postgres.sh", "db", "supervisord"]
    ports:
      - 8080:8080
    depends_on:
      - redis
    links:
      - db
      - redis
  redis:
    image: redis:5.0.6-alpine
    hostname: redis
    volumes:
      - "./redis-data:/data"
    ports:
      - 6379:6379
```
If you have existing services running on ports 5432, 6379, or 8080, update the `config.yml` file to use different ports. 
2. Start all servers using docker-compose:
```bash
docker-compose -f config.yml up
```
3. Open [http://localhost:8080](http://localhost:8080) in a browser and start using Label Studio Enterprise in development mode. 

#### Data persistence

When the Label Studio Enterprise server runs with docker-compose, all essential data is stored inside the container. The following local file storage directories are linked to the container volumes to make sure data persists:
- `./postgres-data` contains PostgreSQL database
- `./redis-data` contains Redis dumps

The integrity of these folders ensures that your data is not lost even if you completely stop and remove all running containers and images. The `./postgres-data` files are specific to the PostgreSQL version. The current supported PostgreSQL version is 11.5.

## Update Label Studio Enterprise

1. [Back up your existing container](#Back-up-Label-Studio-Enterprise).
2. Pull the latest image
3. Update the container

### Get the Docker image version

To check the version of the Label Studio Enterprise Docker image, run [`docker ps`](https://docs.docker.com/engine/reference/commandline/ps/) on the host.

Run the following command as root or using `sudo` and review the output:
```bash
$ docker ps
CONTAINER ID        IMAGE                        COMMAND                  CREATED             STATUS              PORTS                    NAMES
b1dd57a685fb        heartexlabs/heartex:latest   "./deploy/start.sh"      36 minutes ago      Up 36 minutes       0.0.0.0:8080->8000/tcp   heartex
```

The image column displays the Docker image and version number. The image `heartexlabs/heartex:latest` is using the version `latest`.

### Back up Label Studio Enterprise

Back up your Label Studio Enterprise Docker container before you upgrade your version and for disaster recovery purposes. 

1. From the command line, run Docker stop to stop the currently running container with Label Studio Enterprise: 
```bash
docker stop heartex
```
2. Rename the existing container to avoid name conflicts when updating to the latest version:
```bash
docker rename heartex heartex-backup
```

You can then treat the `heartex-backup` image as a backup.

### Pull a new image

After backing up your existing container, pull the latest image of Label Studio Enterprise from the Docker registry.

```bash
docker pull heartexlabs/heartex:latest
```

### Update the container

After you pull the latest image, update your Label Studio Enterprise container:

```bash
docker run -d \
-p $EXPOSE_PORT:8080 \
-v `pwd`/license.txt:/heartex/web/htx/settings/license_docker.txt \
-v `pwd`/logs:/var/log/heartex \
-v `pwd`/postgre-ca-bundle.pem:/etc/ssl/certs/postgre-ca-bundle.pem \
-v `pwd`/redis-ca-bundle.pem:/etc/ssl/certs/redis-ca-bundle.pem \
--name heartex \
heartexlabs/heartex:latest
```

### Restore from a backed up container

If you decide to roll back to the previously backed up version of Label Studio Enterprise, stop and remove the new container and replace it with the backup.

1. From the command line, stop the latest running container and remove it:
```bash
docker stop heartex && docker rm heartex
```
2. Rename the backup container:
```bash
docker rename heartex-backup heartex
```
3. Start the backup container: 
```bash
docker start heartex
```