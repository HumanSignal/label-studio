---
title: Install and upgrade Label Studio
type: guide
order: 200
---

Install Label Studio on premises or in the cloud. Choose the install method that works best for your environment:
- [Install with pip](#Install-with-pip)
- [Install with Docker](#Install-with-docker)
- [Install from source](#Install-from-source)
- [Install with Anaconda](#Install-with-Anaconda)
- [Install for local development](#Install-for-local-development)
- [Upgrade Label Studio](#Upgrade-Label-Studio)


## System requirements
You can install Label Studio on a Linux, Windows, or MacOSX machine running Python 3.6 or later. 

> Note: for Windows users the default installation may fail to build `lxml` package. Consider manually installing it from [the unofficial Windows binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml). If you are running Windows 64-bit with Python 3.8 or later, run `pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl`.

Allocate disk space according to the amount of data you plan to label. As a benchmark, 1 million labeling tasks take up approximately 2.3GB on disk when using the SQLite database. For more on using Label Studio at scale and labeling performance, see [Start Label Studio](start.html). 

## Install with pip

To install Label Studio via pip, you need Python>=3.6 and run:
```bash
pip install label-studio
```

Then, start Label Studio:

```bash
label-studio
```
The default web browser opens automatically at [http://localhost:8080](http://localhost:8080) with Label Studio.

### Troubleshoot installation
If you see any errors during installation, try to rerun the installation.

```bash
pip install --ignore-installed label-studio
```

## Install with Docker

Label Studio is also available as a Docker container. Make sure you have [Docker](https://www.docker.com/) installed on your machine.


### Install with Docker on *nix
To install and start Label Studio at [http://localhost:8080](http://localhost:8080), storing all labeling data in `./my_project` directory, run the following:
```bash
docker run -it -p 8080:8080 -v `pwd`/mydata:/root/.local/share/label-studio/ heartexlabs/label-studio:latest
```

### Install with Docker on Windows
Or for Windows, you have to modify the volumes paths set by `-v` option.

#### Override the default Docker install
You can override the default Docker install by appending new arguments: 
```bash
docker run -it -p 8080:8080 -v `pwd`/mydata:/root/.local/share/label-studio/ heartexlabs/label-studio:latest label-studio --log-level DEBUG
```

### Build a local image with Docker
If you want to build a local image, run:
```bash
docker build -t heartexlabs/label-studio:latest .
```

### Run with Docker Compose
Use Docker Compose to serve Label Studio at `http://localhost:8080`.

Start Label Studio:
```bash
docker-compose up -d
```

This starts Label Studio with a PostgreSQL database backend. 

## Install from source

If you want to use nightly builds or extend the functionality, consider downloading the source code using Git and running Label Studio locally:

```bash
git clone https://github.com/heartexlabs/label-studio.git
cd label-studio
python setup.py develop
```

Then, start Label Studio:

```bash
label-studio 
```
The default web browser opens automatically at [http://localhost:8080](http://localhost:8080).


## Install with Anaconda

```bash
conda create --name label-studio python=3.8
conda activate label-studio
pip install label-studio
```

## Upgrade Label Studio
To upgrade to the latest version of Label Studio, reinstall or upgrade using pip. 


```bash
pip install --upgrade label-studio
```

Migration scripts run when you upgrade to version 1.0.0 from version 0.9.1 or earlier. 

To make sure an existing project gets migrated, when you [start Label Studio](start.html), run the following command:

```bash
label-studio start path/to/old/project 
```

The most important change to be aware of is changes to rename "completions" to "annotations". See the [updated JSON format for completed tasks](export.html#Raw_JSON_format_of_completed_tasks). 

If you customized the Label Studio Frontend, see the [Frontend reference guide](frontend_reference.html) for required updates to maintain compatibility with version 1.0.0.  



## Database storage
Label Studio uses a database to store project data and configuration information. 

### SQLite database

Label Studio uses SQLite by default. You don't need to configure anything. Label Studio stores all data in a single file in the specified directory of the admin user. After you [start Label Studio](start.html), the directory used is printed in the terminal. 

### PostgreSQL database

You can also store your tasks and completions in a [PostgreSQL database](https://www.postgresql.org/) instead of the default SQLite database. This is recommended if you intend to frequently import new labeling tasks, or plan to label hundreds of thousands of tasks or more across projects. 

When you start Label Studio using Docker Compose, you start it using a PostgreSQL database:
```bash
docker-compose up -d
```

#### Create connection on startup

Run the following command to launch Label Studio, configure the connection to your PostgreSQL database, scan for existing tasks, and load them into the app for labeling for a specific project.

```bash
label-studio start my_project --init --db postgresql 
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

