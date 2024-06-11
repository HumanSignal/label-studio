---
title: Install Label Studio Enterprise On-premises using Docker Compose
short: Install using Docker
type: guide
tier: enterprise
order: 0
order_enterprise: 66
meta_title: Install Label Studio Enterprise on-premises using Docker
meta_description: Install, back up, and upgrade Label Studio Enterprise with Docker to create machine learning and data science projects on-premises.
section: "Install & Setup"
parent_enterprise: "install_enterprise"
---

Install Label Studio Enterprise on-premises if you need to meet strong privacy regulations, legal requirements, or want to manage a custom installation on your own infrastructure using Docker or public cloud. If you want to use a different installation method:
- You can use Kubernetes and Helm to deploy Label Studio Enterprise in the cloud. See [Deploy Label Studio Enterprise on Kubernetes](install_enterprise_k8s.html).
- You can run Label Studio Enterprise in an airgapped environment, and no data leaves your infrastructure. See [Install Label Studio Enterprise without public internet access](install_enterprise_airgapped.html).

See [Secure Label Studio](security.html) for more details about security and hardening for Label Studio Enterprise.

<div class="enterprise-only">

To install Label Studio Community Edition, see <a href="install.html">Install and Upgrade Label Studio</a>. This page is specific to the Enterprise version of Label Studio.

</div>

<!-- md deploy.md -->

## Install Label Studio Enterprise using Docker

1. Log in to a Docker registry.
2. Add the license file.
3. Start the server using Docker Compose.

### Prerequisites
Make sure you have an authorization token to retrieve Docker images and a current license file. If you are a Label Studio Enterprise customer and do not have access, [contact us](mailto:hello@heartex.ai) to receive an authorization token and a copy of your license file.

Make sure [Docker Compose](https://docs.docker.com/compose/install/) is installed on your system.

After you install Label Studio Enterprise, the app is automatically connected to the following running services:
- PostgresSQL (versions 11, 12, 13)
- Redis (version 5)

### Log in to a Docker registry

You must be authorized to access Label Studio Enterprise images. 

Set up the Docker login to retrieve the latest Docker image:
```bash
docker login --username heartexlabs
```
When prompted to enter the password, enter the token. If login succeeds, a `~/.docker/config.json` file is created with the authorization settings.  

!!! note 
    If you have default registries specified when logging into Docker, you might need to explicitly specify the registry: `docker login --username heartexlabs docker.io`.

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

1. Create a file, `label-studio-enterprise/env.list` with the required environment variables:
```
# Specify the path to the license file. 
# Alternatively, it can be a URL like LICENSE=https://lic.heartex.ai/db/20210203-1234-ab123456.lic
LICENSE=/label-studio-enterprise/license.txt

# Specify the FQDN name with port if differs from 80
LABEL_STUDIO_HOST=http://localhost/

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
# POSTGRE_SSL_MODE=require

# Optional: Specify Postgre SSL certificate
# POSTGRE_SSLROOTCERT=postgre-ca-bundle.pem

# Optional: Client-side certificate and key
# POSTGRE_SSLCERT=client.crt
# POSTGRE_SSLKEY=client.key

# Redis location e.g. redis[s]://[:password]@localhost:6379/1
# rediss:// scheme is mandatory to use SSL  
REDIS_LOCATION=redis://redis:6379/1

# Optional: Redis database
# REDIS_DB=1

# Optional: Redis password
# REDIS_PASSWORD=12345

# Optional: Redis socket timeout
# REDIS_SOCKET_TIMEOUT=3600

# Optional: Require certificate
# REDIS_SSL_CERTS_REQS=required

# Optional: Specify Redis SSL certificate
# REDIS_SSL_CA_CERTS=redis-ca-bundle.pem

# Optional: Client-side certificate and key
# REDIS_SSL_CERTFILE=client.crt
# REDIS_SSL_KEYFILE=client.key

# Optional: Specify SSL termination certificate & key
# Files should be placed in the directory "certs" at the same directory as docker-compose.yml file
# NGINX_SSL_CERT=/certs/cert.pem
# NGINX_SSL_CERT_KEY=/certs/cert.key
```

2. After you set all the environment variables, create the following `docker-compose.yml`:

```yaml
version: '3.8'

services:
  nginx:
    image: heartexlabs/label-studio-enterprise:VERSION
    ports:
      - "80:8085"
      - "443:8086"
    depends_on:
      - app
    restart: on-failure
    env_file:
      - env.list
    command: nginx
    volumes:
      - ./certs:/certs:ro
    working_dir: /label-studio-enterprise

  app:
    image: heartexlabs/label-studio-enterprise:VERSION
    restart: on-failure
    env_file:
      - env.list
    command: label-studio-uwsgi
    volumes:
      - ./mydata:/label-studio/data:rw
      - ./license.txt:/label-studio-enterprise/license.txt:ro
    working_dir: /label-studio-enterprise

  rqworkers_low:
    image: heartexlabs/label-studio-enterprise:VERSION
    depends_on:
      - app
    env_file:
      - env.list
    volumes:
      - ./mydata:/label-studio/data:rw
      - ./license.txt:/label-studio-enterprise/license.txt:ro
    working_dir: /label-studio-enterprise
    command: [ "python3", "/label-studio-enterprise/label_studio_enterprise/manage.py", "rqworker", "low" ]

  rqworkers_default:
    image: heartexlabs/label-studio-enterprise:VERSION
    depends_on:
      - app
    env_file:
      - env.list
    volumes:
      - ./mydata:/label-studio/data:rw
      - ./license.txt:/label-studio-enterprise/license.txt:ro
    working_dir: /label-studio-enterprise
    command: [ "python3", "/label-studio-enterprise/label_studio_enterprise/manage.py", "rqworker", "default"]

  rqworkers_high:
    image: heartexlabs/label-studio-enterprise:VERSION
    depends_on:
      - app
    env_file:
      - env.list
    volumes:
      - ./mydata:/label-studio/data:rw
      - ./license.txt:/label-studio-enterprise/license.txt:ro
    working_dir: /label-studio-enterprise
    command: [ "python3", "/label-studio-enterprise/label_studio_enterprise/manage.py", "rqworker", "high" ]

  rqworkers_critical:
    image: heartexlabs/label-studio-enterprise:VERSION
    depends_on:
      - app
    env_file:
      - env.list
    volumes:
      - ./mydata:/label-studio/data:rw
      - ./license.txt:/label-studio-enterprise/license.txt:ro
    working_dir: /label-studio-enterprise
    command: [ "python3", "/label-studio-enterprise/label_studio_enterprise/manage.py", "rqworker", "critical" ]
```

3. Run Docker Compose:

```bash
docker-compose up
```

!!! note 
    If you expose port 80, you must start Docker with `sudo`.

### Get the Docker image version

To check the version of the Label Studio Enterprise Docker image, use the [`docker ps`](https://docs.docker.com/engine/reference/commandline/ps/) command on the host. 

From the command line, run the following as root or using `sudo` and review the output:
```bash
$ docker ps
03b88eebdb65   heartexlabs/label-studio-enterprise:2.2.8-1   "uwsgi --ini deploy/…"   36 hours ago   Up 36 hours   0.0.0.0:80->8000/tcp   label-studio-enterprise_app_1
```
In this example output, the image column displays the Docker image and version number. The image `heartexlabs/label-studio-enterprise:2.2.8-1` is using the version `2.2.8-1`.
