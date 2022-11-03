---
title: Install and upgrade Label Studio
type: guide
order: 200
meta_title: Install and Upgrade
meta_description: Label Studio documentation for installing and upgrading Label Studio with Docker, pip, and anaconda to use for your machine learning and data science projects. 
---

Install Label Studio on premises or in the cloud. Choose the installation method that works best for your environment:
- [Install with pip](#Install-with-pip)
- [Install with Docker](#Install-with-Docker)
- [Install on Ubuntu](#Install-on-Ubuntu)
- [Install from source](#Install-from-source)
- [Install with Anaconda](#Install-with-Anaconda)
- [Upgrade Label Studio](#Upgrade-Label-Studio)

<!-- md deploy.md -->

### Web browser support
Label Studio is tested with the latest version of Google Chrome and is expected to work in the latest versions of:
- Google Chrome
- Apple Safari
- Mozilla Firefox

If using other web browsers, or older versions of supported web browsers, unexpected behavior could occur. 

## Install prerequisite
Install Label Studio in a clean Python environment. We highly recommend using a virtual environment (venv or conda) to reduce the likelihood of package conflicts or missing packages.

## Install with pip

To install Label Studio with pip and a virtual environment, you need Python version 3.7 or later. Run the following:
```bash
python3 -m venv env
source env/bin/activate
python -m pip install label-studio
```

To install Label Studio with pip, you need Python version 3.7 or later. Run the following:
```bash
pip install label-studio
```

After you install Label Studio, start the server with the following command: 
```bash
label-studio
```
The default web browser opens automatically at [http://localhost:8080](http://localhost:8080) with Label Studio. See [start Label Studio](start.html) for more options when starting Label Studio.

## Install with Docker

Label Studio is also available as a Docker container. Make sure you have [Docker](https://www.docker.com/) installed on your machine.


### Install with Docker on *nix
To install and start Label Studio at [http://localhost:8080](http://localhost:8080), storing all labeling data in `./my_project` directory, run the following:
```bash
docker run -it -p 8080:8080 -v $(pwd)/mydata:/label-studio/data heartexlabs/label-studio:latest
```

### Install with Docker on Windows
Or for Windows, you have to modify the volumes paths set by `-v` option.

#### Override the default Docker install
You can override the default Docker install by appending new arguments.

In Windows Command Line (cmd):
```bash
docker run -it -p 8080:8080 -v %cd%/mydata:/label-studio/data heartexlabs/label-studio:latest label-studio --log-level DEBUG
```

In PowerShell:
```bash
docker run -it -p 8080:8080 -v ${PWD}/mydata:/label-studio/data heartexlabs/label-studio:latest label-studio --log-level DEBUG
```

### Build a local image with Docker
If you want to build a local image, run:
```bash
docker build -t heartexlabs/label-studio:latest .
```

### Run with Docker Compose
Use Docker Compose to serve Label Studio at `http://localhost:8080`. You must use Docker Compose version 1.25.0 or higher.

Start Label Studio:
```bash
docker-compose up -d
```

This starts Label Studio with a PostgreSQL database backend. You can also use a PostgreSQL database without Docker Compose. See [Set up database storage](storedata.html).

### Install Label Studio without internet access
Download label-studio docker image (host with internet access and docker):
```bash 
docker pull heartexlabs/label-studio:latest
```

Export it as a tar archive: 
```bash
docker save heartexlabs/label-studio:latest | gzip > label_studio_latest.tar.gz
```

Transfer it to another VM:
```bash
scp label_studio_latest.tar.gz <ANOTHER_HOST>:/tmp
```

SSH into <ANOTHER_HOST> and import the archive:
```bash
docker image import /tmp/label_studio_latest.tar.gz
```

Follow steps from [Install and Upgrade to run LS](install.html#Install-with-Docker).

## Install on Ubuntu

To install Label Studio on Ubuntu and run it in a virtual environment, run the following command:

```bash
python3 -m venv env
source env/bin/activate
sudo apt install python3.9-dev
python -m pip install label-studio
```

## Install from source

If you want to use nightly builds or extend the functionality, consider downloading the source code using Git and running Label Studio locally:

```bash
git clone https://github.com/heartexlabs/label-studio.git
cd label-studio
# Install all package dependencies
pip install -e .
# Run database migrations
python label_studio/manage.py migrate
# Start the server in development mode at http://localhost:8080
python label_studio/manage.py runserver
```

## Install with Anaconda

```bash
conda create --name label-studio
conda activate label-studio
pip install label-studio
```

## Troubleshoot installation

You might see errors when installing Label Studio. Follow these steps to resolve them.

### Run the latest version of Label Studio
Many bugs might be fixed in patch releases or maintenance releases. Make sure you're running the latest version of Label Studio by upgrading your installation before you start Label Studio. 

### Errors about missing packages

If you see errors about missing packages, install those packages and try to install Label Studio again. Make sure that you run Label Studio in a clean Python environment, such as a virtual environment.

For Windows users the default installation might fail to build the `lxml` package. Consider manually installing it from [the unofficial Windows binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml). If you are running Windows 64-bit with Python 3.8 or later, run `pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl` to install it. 


### Errors from Label Studio 

If you see any other errors during installation, try to rerun the installation.

```bash
pip install --ignore-installed label-studio
```

### OpenBLAS blas_thread_init: pthread_create failed for thread X of Y: Operation not permitted

Upgrade Docker Engine to the latest available version(>= [20.10.12](https://docs.docker.com/engine/release-notes/#201012)).

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
