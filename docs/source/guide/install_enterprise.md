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
When prompted to enter the password, enter the token. If login succeeds, a `~/.docker/config.json` file is created with the authorization settings.  

> If you have default registries specified when logging into Docker, you might need to explicitly specify the registry: `docker  login --username heartexlabs docker.io`.

2. Pull the latest Label Studio Enterprise image:
```bash
docker pull heartexlabs/label-studio-enterprise:latest
```
> Note: You might need to use `sudo` to log in or pull images.

### Add the license file 
After you retrieve the latest Label Studio Enterprise image, add the license file. You can't start the Docker image without a license file. 

1. Create a working directory called `label-studio-enterprise` and place the license file in it.
```bash
mkdir -p label-studio-enterprise
cd label-studio-enterprise
```
2. Move the license file, `license.txt`, to the `label-studio-enterprise` directory.

### Start using Docker

To run Label Studio Enterprise in production, start it using Docker. This configuration allows you to link Label Studio with external databases and services.

1. Create a file, `label-studio-enterprise/env.list` with the required environmental variables:
```
# The main server URL (must be a full path like protocol://host:port)
LABEL_STUDIO_HOST=https://my.heartex.domain.com

# Specify the license file name
LICENSE=license.txt

DJANGO_DB=default
DEBUG=false
LOG_LEVEL=ERROR
DJANGO_SETTINGS_MODULE=htx.settings.label_studio

# Edit if you used version 1 of the Heartex platform and must migrate data
V1_DATABASE_DSN=host=v1.prod.database.us-east-1.rds.amazonaws.com password=AbCdE12345678 dbname=v1_db user=v1_user port=5432

# Email server settings
EMAIL_BACKEND=sendgrid_backend.SendgridBackend
SENDGRID_API_KEY=

# PostgreSQL database name
POSTGRE_NAME=prod_db
# PostgreSQL database user
POSTGRE_USER=postgres
# PostgreSQL database password
POSTGRE_PASSWORD=
# PostgreSQL database host
POSTGRE_HOST=v2.prod.database.us-east-1.rds.amazonaws.com
# PostgreSQL database port
POSTGRE_PORT=5432

#If you use Redis instead of Postgres, use these options
# Redis location e.g. redis://[:password]@localhost:6379/1
REDIS_LOCATION=redis://@v2.prod.redis.cache.amazonaws.com:6379/1
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
-v `pwd`/license.txt:/label-studio-enterprise/web/htx/settings/license_docker.txt \
-v `pwd`/logs:/var/log/label-studio-enterprise \
-v `pwd`/postgre-ca-bundle.pem:/etc/ssl/certs/postgre-ca-bundle.pem \
-v `pwd`/redis-ca-bundle.pem:/etc/ssl/certs/redis-ca-bundle.pem \
--name label-studio-enterprise \
heartexlabs/label-studio-enterprise:latest
```

> Note: If you expose port 80, you must start Docker with `sudo`.

### Start using Docker Compose

To run Label Studio Enterprise in development mode, start Label Studio using Docker Compose and local PostgreSQL and Redis servers to store data and configurations. 

> Follow these instructions only if you plan to use Label Studio Enterprise in development mode. Otherwise, see [Start Using Docker](#Start-using-Docker) on this page.

#### Prerequisites
Make sure [Docker Compose](https://docs.docker.com/compose/install/) version 1.25.0 or higher is installed on your system.

#### Start Label Studio Enterprise in development mode

1. Create a Docker Compose configuration file `label-studio-enterprise/config.yml` with the following content:

```yaml
version: '3.3'

services:
  app:
    image: heartexlabs/label-studio-enterprise:latest
    ports:
      - 80:8000
    env_file:
      - env.example
    volumes:
      - ./mydata:/label-studio/data:rw
    working_dir: /label-studio-enterprise
    command: [ "uwsgi", "--ini", "deploy/uwsgi.ini"]

  rqworkers:
    image: heartexlabs/label-studio-enterprise:latest
    env_file:
      - env.example
    volumes:
      - ./mydata:/label-studio/data:rw
    working_dir: /label-studio-enterprise
    command: [ "python3", "/label-studio-enterprise/label_studio_enterprise/manage.py", "rqworker", "default" ]
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
b1dd57a685fb        heartexlabs/label-studio-enterprise:latest   "./deploy/start.sh"      36 minutes ago      Up 36 minutes       0.0.0.0:8080->8000/tcp   label-studio-enterprise
```

The image column displays the Docker image and version number. The image `heartexlabs/label-studio-enterprise:latest` is using the version `latest`.

### Back up Label Studio Enterprise

Back up your Label Studio Enterprise Docker container before you upgrade your version and for disaster recovery purposes. 

1. From the command line, run Docker stop to stop the currently running container with Label Studio Enterprise: 
```bash
docker stop label-studio-enterprise
```
2. Rename the existing container to avoid name conflicts when updating to the latest version:
```bash
docker rename label-studio-enterprise label-studio-enterprise-backup
```

You can then treat the `heartex-backup` image as a backup.

### Pull a new image

After backing up your existing container, pull the latest image of Label Studio Enterprise from the Docker registry.

```bash
docker pull heartexlabs/label-studio-enterprise:latest
```

### Update the container

After you pull the latest image, update your Label Studio Enterprise container:

```bash
docker run -d \
-p $EXPOSE_PORT:8080 \
-v `pwd`/license.txt:/label-studio-enterprise/web/htx/settings/license_docker.txt \
-v `pwd`/logs:/var/log/label-studio-enterprise \
-v `pwd`/postgre-ca-bundle.pem:/etc/ssl/certs/postgre-ca-bundle.pem \
-v `pwd`/redis-ca-bundle.pem:/etc/ssl/certs/redis-ca-bundle.pem \
--name label-studio-enterprise \
heartexlabs/label-studio-enterprise:latest
```

### Restore from a backed up container

If you decide to roll back to the previously backed up version of Label Studio Enterprise, stop and remove the new container and replace it with the backup.

1. From the command line, stop the latest running container and remove it:
```bash
docker stop label-studio-enterprise && docker rm label-studio-enterprise
```
2. Rename the backup container:
```bash
docker rename label-studio-enterprise-backup label-studio-enterprise
```
3. Start the backup container: 
```bash
docker start label-studio-enterprise
```