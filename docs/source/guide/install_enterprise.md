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

1. Pull the latest image.
2. Add the license file.
3. Start the server using Docker Compose.

### Prerequisites
Make sure you have an authorization token to retrieve Docker images and a current license file. If you are a Label Studio Enterprise customer and do not have access, [contact us](mailto:hello@heartex.ai) to receive an authorization token and a copy of your license file.

Make sure [Docker Compose](https://docs.docker.com/compose/install/) is installed on your system.

After you install Label Studio Enterprise, the app is automatically connected to the following running services:
- PostgresSQL (versions 11, 12, 13)
- Redis (version 5)

### Pull the latest image

You must be authorized to access Label Studio Enterprise images. 

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

### Start using Docker Compose

To run Label Studio Enterprise in production, start it using [Docker compose](https://docs.docker.com/compose/). This configuration lets you connect Label Studio to external databases and services.

1. Create a file, `label-studio-enterprise/env.list` with the required environmental variables:
```
# Specify the path to the license file. 
# Alternatively, it can be a URL like LICENSE=https://lic.heartex.ai/db/20210203-1234-ab123456.lic
LICENSE=/label-studio-enterprise/license.txt

# Database engine (PostgreSQL by default)
DJANGO_DB=default

# Default configuration
DJANGO_SETTINGS_MODULE=htx.settings.label_studio

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

# Optional: PostgreSQL SSL mode
POSTGRE_SSL_MODE=require

# Optional: Specify Postgre SSL certificate
POSTGRE_SSLROOTCERT=postgre-ca-bundle.pem

# Redis location e.g. redis://[:password]@localhost:6379/1
REDIS_LOCATION=localhost:6379

# Optional: Redis database
REDIS_DB=1

# Optional: Redis password
REDIS_PASSWORD=12345

# Optional: Redis socket timeout
REDIS_SOCKET_TIMEOUT=3600

# Optional: Use Redis SSL connection
REDIS_SSL=1

# Optional: Require certificate
REDIS_SSL_CERTS_REQS=required

# Optional: Specify Redis SSL certificate
REDIS_SSL_CA_CERTS=redis-ca-bundle.pem
```

2. After you set all the environment variables, create the following `docker-compose.yml`:

```yaml
version: '3.3'

services:
  app:
    stdin_open: true
    tty: true
    image: heartexlabs/label-studio-enterprise:latest
    ports:
      - 80:8000
    env_file:
      - env.list
    volumes:
      - ./license.txt:/label_studio_enterprise/license.txt
      - ./mydata:/label-studio/data:rw
    working_dir: /label-studio-enterprise
    command: [ "uwsgi", "--ini", "deploy/uwsgi.ini"]

  rqworkers:
    image: heartexlabs/label-studio-enterprise:latest
    env_file:
      - env.list
    volumes:
      - ./license.txt:/label_studio_enterprise/license.txt
      - ./mydata:/label-studio/data:rw
    working_dir: /label-studio-enterprise
    command: [ "python3", "/label-studio-enterprise/label_studio_enterprise/manage.py", "rqworker", "default" ]


volumes:
  static: {} 
```

3. Run Docker Compose:

```bash
docker-compose up
```

> Note: If you expose port 80, you must start Docker with `sudo`.

4. If you're starting Docker for the first time, you must run the database migrations to make sure that the `postgres` database already exists:

```bash
docker-compose run app python3 label_studio_enterprise/manage.py migrate
```

### Get the Docker image version

To check the version of the Label Studio Enterprise Docker image, use the [`docker ps`](https://docs.docker.com/engine/reference/commandline/ps/) command on the host. 

From the command line, run the following as root or using `sudo` and review the output:
```bash
$ docker ps
03b88eebdb65   heartexlabs/label-studio-enterprise:latest   "uwsgi --ini deploy/…"   36 hours ago   Up 36 hours   0.0.0.0:80->8000/tcp   label-studio-enterprise_app_1
```
In this example output, the image column displays the Docker image and version number. The image `heartexlabs/label-studio-enterprise:latest` is using the version `latest`.