---
title: Install Label Studio
type: guide
order: 101
---

Install Label Studio on-premises or in the cloud. Choose the install method that works best for your environment:
- [Install with pip](#Install-with-pip)
- [Install with Docker](#Install-with-docker)
- [Install from source](#Install-from-source)
- [Install with Anaconda](#Install-with-Anaconda)
- [Install for local development](#Install-for-local-development)
<!--add anaconda and info from README here, make sure they match-->


## System requirements
You can install Label Studio on a Linux, Windows, or MacOSX machine running Python 3.5 – 3.8. Python 3.9 is not yet supported. 
<!--any OS version restrictions?--> 


> Note: for Windows users the default installation may fail to build `lxml` package. Consider manually installing it from [the unofficial Windows binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml). If you are running Windows 64-bit with Python 3.8, run `pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl`.


## Install with pip

To install Label Studio via pip, you need Python>=3.5 and <3.9 and run:
```bash
pip install label-studio
```

Then, launch a new project that stores all labeling data in a local directory called `my_project`:

```bash
label-studio start my_project --init
```
The default web browser opens automatically at [http://localhost:8080](http://localhost:8080) with Label Studio.

### Troubleshoot installation
If you see any errors during installation, try to rerun the installation.

```bash
pip install --ignore-installed label-studio
```

## Install with Docker

Label Studio is also available as a docker container. Make sure you have [Docker](https://www.docker.com/) installed on your machine.


### Install with Docker on *nix
To install and start Label Studio at [http://localhost:8080](http://localhost:8080), storing all labeling data in `./my_project` directory, run the following:
```bash
docker run --rm -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest
```

### Install with Docker on Windows
Or for Windows, run the following: 
```bash
docker run --rm -p 8080:8080 -v `pwd`\my_project:\label-studio\my_project --name label-studio heartexlabs/label-studio:latest
```
<!--> Note: for Windows, you have to modify the volumes paths set by `-v` option-->

#### Override the default Docker install
By default, the default Docker install command creates a blank project in a `./my_project` directory. If the `./my_project` folder already exists, Label Studio fails to start. Rename or delete the folder, or use the `--force` argument to force Label Studio to start: 

```bash
docker run -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest label-studio start my_project --init --force --template text_classification
```

### Build a local image with Docker
If you want to build a local image, run:
```bash
docker build -t heartexlabs/label-studio:latest .
```

### Run with Docker Compose
Use Docker Compose to serve Label Studio at `http://localhost:8080`.

Run this command the first time you run Label Studio:
```bash
INIT_COMMAND='--init' docker-compose up -d
```

Start Label Studio after you have an existing project:
```bash
docker-compose up -d
```

Start Label Studio and reset all project data: 
```bash
INIT_COMMAND='--init --force' docker-compose up -d
```
You can also set environment variables in the .env file instead of specifying `INIT_COMMAND`. 

For example, add the following line to have the option to reset all project data when starting Label Studio:
```bash
INIT_COMMAND=--init --force
```

## Install from source

If you want to use nightly builds or extend the functionality, consider downloading the source code using Git and running Label Studio locally:

```bash
git clone https://github.com/heartexlabs/label-studio.git
cd label-studio
python setup.py develop
```

Then, create a new project that stores all labeling data in a local directory `my_project`:

```bash
label-studio start my_project --init
```
The default web browser opens automatically at [http://localhost:8080](http://localhost:8080).


## Install with Anaconda

```bash
conda create --name label-studio python=3.8
conda activate label-studio
pip install label-studio
```

## Install for local development

You can run the latest Label Studio version locally without installing the package with pip. 

```bash
# Install all package dependencies
pip install -e .
```
```bash
# Start the server at http://localhost:8080
python label_studio/server.py start labeling_project --init
```


## Advanced options for starting and running Label Studio

Additional options for starting and running Label Studio after you install. 

### Multisession mode

You can start Label Studio in **multisession mode**. In this mode, each browser session creates its own project with the associated session ID as a name.

In order to launch Label Studio in multisession mode and keep all projects in a separate directory called `session_projects`, run the following:

```bash
label-studio start-multi-session --root-dir ./session_projects
```
Additional command line arguments are not supported in multisession mode. 


## Command line arguments

You can specify input tasks, project config, machine learning backend and other options using the command line interface. Run `label-studio start --help` to see all available options.


### Authenticate with login and password
You can restrict access to Label Studio using basic HTTP authentication. You can specify a username and password to use when starting Label Studio, or use the project `config.json` file. 

Start Label Studio with HTTP authentication from the command line:
```bash
label-studio start my_project --username user --password pwd 
```

Require HTTP authentication when starting Label Studio by placing `username` and `password` in the project config.json as follows:
 
```
{ 
 ...
 "username": "user", 
 "password": "pwd",
 ...
}
```

Use HTTP authentication with Label Studio in Docker, by setting up `USERNAME` and `PASSWORD` environment variables. 

Label Studio uses the same username and password for all users.


### Use WSGIServer instead of Flask

Use `--use-gevent` option on start to enable WSGI server. It wraps around app.run with gevent's WSGIServer to enable the server to better handle concurrent requests.

```
label-studio start test --use-gevent
```

### HTTPS & SSL

You can enable the HTTPS protocol for Flask or WSGIServer. You must generate an SSL certificate and key for it. 

For example, run the following to generate a certificate and key file: 

```
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out certificate.pem
```

Then, use the `--cert` and `--key` options to start Label Studio:

```
label-studio start test --cert certificate.pem --key key.pem
```


## Health check for Label Studio
<!--move to troubleshooting-->

LS has a special endpoint to run health checks: 
  
```
/api/health
```
