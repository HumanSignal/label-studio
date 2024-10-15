---
title: Set up the database 
type: guide
tier: opensource
order: 84
order_enterprise: 0
meta_title: Database Storage Setup
meta_description: Configure the database storage used by Label Studio to ensure performant and scalable data and configuration storage.
section: "Install & Setup"
---

Label Studio uses a database to store project data and configuration information.

## Labeling performance
The SQLite database might work well for projects with tens of thousands of labeling tasks, as long as you don't plan on using complex filters in the data manager and other complex multi-user pipelines. If you want to annotate millions of tasks or anticipate a lot of concurrent users or your plan to work on real life projects, use a PostgreSQL database. See [Install and upgrade Label Studio](install.html#PostgreSQL-database) for more.  

For example, if you import data while labeling is being performed, labeling tasks can take more than 10 seconds to load and annotations can take more than 10 seconds to perform. If you want to label more than 100,000 tasks with 5 or more concurrent users, consider using PostgreSQL or another database with Label Studio. 

## SQLite database

Label Studio uses SQLite by default. You don't need to configure anything. Label Studio stores all data in a single file in the specified directory of the admin user. After you [start Label Studio](start.html), the directory used is printed in the terminal. 

## PostgreSQL database

You can also store your tasks and completions in a [PostgreSQL database](https://www.postgresql.org/) instead of the default SQLite database. This is recommended if you intend to frequently import new labeling tasks, or plan to label hundreds of thousands of tasks or more across projects.

### Create connection on startup

Run the following command to launch Label Studio, configure the connection to your PostgreSQL database, scan for existing tasks, and load them into the app for labeling for a specific project.

```bash
label-studio start my_project --init -db postgresql 
```

You must set the following environment variables to connect Label Studio to PostgreSQL:

```
DJANGO_DB=default
POSTGRE_NAME=postgres
POSTGRE_USER=postgres
POSTGRE_PASSWORD=
POSTGRE_PORT=5432
POSTGRE_HOST=db
```

### Create connection with Docker Compose

When you start Label Studio using Docker Compose, you start it using a PostgreSQL database:
```bash
docker-compose up -d
```

## Minio Blob Storage
MinIO is a blob storage solution that is compatible with Amazon S3. You can use MinIO to store your labeling tasks.

### Starting the containers
For local development, you can host a local MinIO server to emulate an S3-based production environment more closely. 
An example docker-compose file for this is available in the [Label Studio repository](https://github.com/heartexlabs/label-studio).

To run MinIO alongside your Label Studio instance, use the following command:
````bash
# Add sudo on Linux if you are not a member of the docker group
docker compose -f docker-compose.yml -f docker-compose.minio.yml up -d
````
The MinIO server will be accessible at http://localhost:9000. 
To configure MinIO settings, create a `.env` file. Remember to override the default credentials.

````.dotenv
MINIO_ROOT_USER=minio_admin_do_not_use_in_production
MINIO_ROOT_PASSWORD=minio_admin_do_not_use_in_production
````

### Connect Label Studio to local MinIO

If you do not have a static IP address, create an entry in your hosts file so that both the Label Studio container and 
your browser can find MinIO at the same hostname.

The following entry redirects all requests to MinIO to your local system:
```text
127.0.0.1 minio
```

On Windows, you can find your hosts file at `C:\Windows\System32\drivers\etc\hosts`.
On Linux, you can find your hosts file at `/etc/hosts`.
On macOS, you can find your hosts file at `/private/etc/hosts`.

After modifying your hosts file, you can connect to your MinIO server with your browser at http://minio:9000.

### Remove MinIO data
You can remove your MinIO installation by removing the containers and the associated volumes. 
This operation is destructive and will remove all data stored in MinIO.
```bash
docker-compose -f docker-compose.minio.yml down --volumes
```


## Data persistence

If you're using a Docker container, Heroku, or another cloud provider, you might want your data to persist after shutting down Label Studio. You can [export your data](export.html) to persist your labeling task data and annotations, but to preserve the state of Label Studio and assets such as files that you uploaded for labeling, set up data persistence. 

### Persist data with Docker

Mount Docker volumes on your machine to persist the internal SQLite database and assets that you upload to Label Studio after you terminate a Docker container running Label Studio. 

If you're starting a Docker container from the command line, use volumes to persist the data. See the Docker documentation for [Use volumes](https://docs.docker.com/storage/volumes/). For example, replace the existing volume flag in the Docker command with a volume that you specify:
```bash
docker run -it -p 8080:8080 -v <yourvolume>:/label-studio/data heartexlabs/label-studio:latest
```

!!! attention "important"
    As this is a non-root container, the mounted files and directories must have the proper permissions for the `UID 1001`.

If you're using Docker Compose with the [config included in the Label Studio repository](https://github.com/heartexlabs/label-studio/blob/master/docker-compose.yml), you can set up Docker volumes in the `docker-compose.yml` file for Label Studio:
```
version: "3.3"
services:
  label_studio:
    image: heartexlabs/label-studio:latest
    container_name: label_studio
    ports:
      - 8080:8080
    volumes:
      - ./mydata:/label-studio/data

volumes:
  mydata:
```

!!! attention "important"
    As this is a non-root container, the mounted files and directories must have the proper permissions for the `UID 1001`.

For more about specifying volumes in Docker Compose, see the volumes section of the [Docker Compose file documentation](https://docs.docker.com/compose/compose-file/compose-file-v3/#volumes).

### Persist data with a cloud provider
Host a PostgreSQL server that you manage and set up the PostgreSQL environment variables with Label Studio to persist data from a cloud provider such as Heroku, Amazon Web Services, Google Cloud Services, or Microsoft Azure. 


