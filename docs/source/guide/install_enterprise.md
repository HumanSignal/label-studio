---
title: Install Label Studio Enterprise on-premises using Docker
type: guide
order: 201
meta_title: Install and Upgrade Enterprise
meta_description: Label Studio Documentation for installing and upgrading Label Studio Enterprise with Docker or on AWS to use for your machine learning and data science projects. 
---

You can install Label Studio Enterprise on-premises if you need to meet strong privacy regulations, legal requirements, or want to manage a custom installation on your own infrastructure using Docker or public cloud. To deploy Label Studio Enterprise on Amazon AWS in a Virtual Private Cloud (VPC), see [Install Label Studio Enterprise on AWS Private Cloud](install_enterprise_vpc.html). 

You can run Label Studio Enterprise in an airgapped environment, and no data leaves your infrastructure. See [Secure Label Studio](security.html) for more details about security and hardening for Label Studio Enterprise.

> To install Label Studio Community Edition, see [Install and Upgrade Label Studio](install.html). This page is specific to the Enterprise version of Label Studio.

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
# The main server URL (must be full path like protocol://host:port)
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

# PostgreSQL SSL mode (https://www.postgresql.org/docs/9.1/libpq-ssl.html)
POSTGRE_SSL_MODE=require

# Specify Postgre SSL certificate
POSTGRE_SSLROOTCERT=postgre-ca-bundle.pem

# Redis location e.g. rediss://[:password]@localhost:6379/1
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
REDIS_SSL_CA_CERTS=redis-ca-bundle.pe
```

### LDAP authentication setup

You can set up LDAP auth and assign LDAP users to one platform's organization via docker environment variables. Here is an working example: 

```
AUTH_LDAP_ENABLED=1
AUTH_LDAP_SERVER_URI=ldap://www.zflexldap.com
AUTH_LDAP_BIND_DN=cn=ro_admin,ou=sysadmins,dc=zflexsoftware,dc=com
AUTH_LDAP_BIND_PASSWORD=zflexpass
AUTH_LDAP_USER_DN_TEMPLATE=uid=%(user)s,ou=users,ou=guests,dc=zflexsoftware,dc=com

# Group parameters
AUTH_LDAP_GROUP_SEARCH_BASE_DN=ou=users,ou=guests,dc=zflexsoftware,dc=com
AUTH_LDAP_GROUP_SEARCH_FILTER_STR=(objectClass=groupOfNames)
AUTH_LDAP_GROUP_TYPE=ou

# Populate the user from the LDAP directory, values below are set by default 
AUTH_LDAP_USER_ATTR_MAP_FIRST_NAME=givenName
AUTH_LDAP_USER_ATTR_MAP_LAST_NAME=sn
AUTH_LDAP_USER_ATTR_MAP_EMAIL=mail

# Specifity organization to assign on the platform 
AUTH_LDAP_ORGANIZATION_OWNER_EMAIL=heartex@heartex.net

# Advanced options, read more about options and values here: 
# https://www.python-ldap.org/en/latest/reference/ldap.html#options
AUTH_LDAP_CONNECTION_OPTIONS=OPT_X_TLS_CACERTFILE=/certificates/ca.crt;OPT_X_TLS_REQUIRE_CERT=OPT_X_TLS_DEMAND
```

For test login use `guest1` with password `guest1password`.  

4.2. When all variables are set, run docker exposing 8080 port:

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

> Note: If you expose 80 port, you need to start docker with `sudo`.

### Start using Docker Compose

To run Label Studio Enterprise in development mode, start Label Studio using Docker Compose and local PostgreSQL and Redis servers to store data and configurations.  

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
3. Open [http://localhost:8080](http://localhost:8080) in a browser and start using Label Studio Enterprise. 

#### Data persistence

When the Label Studio Enterprise server runs with docker-compose, all essential data is stored inside the container. The following local file storage directories are linked to the container volumes to make sure data persists:

- `./postgres-data` contains PostgreSQL database
- `./redis-data` contains Redis dumps

The integrity of these folders ensures that your data is not lost even if you completely stop and remove all running containers and images. The `./postgres-data` files are specific to the PostgreSQL version. The current supported PostgreSQL version is 11.5.

## Update Label Studio Enterprise

1. Back up your existing container
2. Pull the latest image
3. Update the container

### Get the Docker image version

## Back up Label Studio Enterprise

### Pull a new image

### Update the container

### Restore from a backed up container
