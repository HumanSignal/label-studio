---
title: Database setup 
type: guide
order: 205
meta_title: Database Storage Setup
meta_description: Configure the database storage used by Label Studio in your data labeling and machine learning projects to ensure performant and scalable data and configuration storage.
---
Label Studio uses a database to store project data and configuration information.


## Labeling performance

The SQLite database works well for projects with tens of thousands of labeling tasks. If you want to annotate millions of tasks or anticipate a lot of concurrent users, use a PostgreSQL database. For more information, see [Install and upgrade Label Studio](install.html#PostgreSQL-database).

For example, if you import data while labeling is being performed, labeling tasks can take more than 10 seconds to load and annotations can take more than 10 seconds to perform. If you want to label more than 100,000 tasks with 5 or more concurrent users, consider using PostgreSQL or another database with Label Studio. 


## SQLite database

Label Studio uses SQLite by default. You don't need to configure anything. Label Studio stores all data in a single file in the specified directory of the admin user. After you [start Label Studio](start.html), the directory used is printed in the terminal. 


## PostgreSQL database

!!! attention "important"
    Heartex recommends the following method only if you intend to frequently import new labeling tasks, or plan to label hundreds of thousands of tasks or more across projects.

You can also store your tasks and completions in a [PostgreSQL database](https://www.postgresql.org/) instead of the default SQLite database. 


### Create a connection on startup

To create a connection on startup, do the following steps:

1. Run the following command to launch Label Studio.

```bash
label-studio start my_project --init -db postgresql 
```

2. Configure the connection to your PostgreSQL database.

3. Scan for existing tasks.

4. Load the existing tasks into the app to label a specific project.

5. Set the following environment variables to connect Label Studio to PostgreSQL:

```
DJANGO_DB=default
POSTGRE_NAME=postgres
POSTGRE_USER=postgres
POSTGRE_PASSWORD=
POSTGRE_PORT=5432
POSTGRE_HOST=db
```

### Create a connection with Docker Compose

To create a connection with Docker Compose, use a PostgreSQL database by running the following command:

```bash
docker-compose up -d
```


## Data persistence

If you are using a Docker container, Heroku, or another cloud provider, you might want your data to persist after shutting down Label Studio. You can [export your data](export.html) to persist your labeling task data and annotations, but to preserve the state of Label Studio and assets such as files that you uploaded for labeling, set up data persistence. 

### Persist data with Docker

Mount Docker volumes on your machine to persist the internal SQLite database and assets that you upload to Label Studio after you terminate a Docker container running Label Studio. 

If you are starting a Docker container from the command line, use volumes to persist the data. For more information, see the Docker documentation on how to [Use volumes](https://docs.docker.com/storage/volumes/). For example, replace the existing volume flag in the Docker command with a volume that you specify:
```bash
docker run -it -p 8080:8080 -v <yourvolume>:/label-studio/data heartexlabs/label-studio:latest
```

If you are using Docker Compose with the [configuration included in the Label Studio repository](https://github.com/heartexlabs/label-studio/blob/master/docker-compose.yml), you can set up Docker volumes in the `docker-compose.yml` file for Label Studio:
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
For more about specifying volumes in Docker Compose, see the volumes section of the [Docker Compose file documentation](https://docs.docker.com/compose/compose-file/compose-file-v3/#volumes).

### Persist data with a cloud provider

Host a PostgreSQL server that you manage and set up the PostgreSQL environment variables with Label Studio to persist data from a cloud provider (Heroku, Amazon Web Services, Google Cloud Services, or Microsoft Azure). 
