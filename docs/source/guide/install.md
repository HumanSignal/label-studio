---
title: Install Label Studio
type: guide
order: 101
---

Install Label Studio on-premises or in the cloud. Choose the install method that works best for your environment:
- [Install with pip](#install-with-pip)
- [Install with Docker](#install-with-docker)
- [Install from source](#install-from-source)
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


## Install with Docker

Label Studio is also available as a docker container. Make sure you have [Docker](https://www.docker.com/) installed on your machine.


### Install with Docker on *nix
To install and start Label Studio at [http://localhost:8080](http://localhost:8080), storing all labeling data in `./my_project` directory, run the following:
```bash
docker run --rm -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest
```

### Install with Docker on Windows
Or for Windows,
TYPE THE COMMAND AGAIN BUT WINDOWSIFIED
```bash
docker run --rm -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest
```
> Note: for Windows, you have to modify the volumes paths set by `-v` option

### Troubleshoot Docker install
> Note: if `./my_project` the folder exists, you see an error and Label Studio fails to start. Rename or delete this folder or use the `--force` option.

You can override the default startup command by appending any of [available command line arguments]():

```bash
docker run -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest label-studio start my_project --init --force --template image_mixedlabel
```

### Build a local image of Label Studio in Docker
If you want to build a local image, run:
```bash
docker build -t heartexlabs/label-studio:latest .
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



## MISCELLANEOUS STARTING AND RUNNING STUFF IS BELOW THIS HEADER


### Multisession mode

You can start Label Studio in _multisession mode_ - each browser session creates its own project with associated session ID as a name.

In order to launch Label Studio in multisession mode and keep all projects in a separate directory `session_projects`, run

```bash
label-studio start-multi-session --root-dir ./session_projects
```


## Command line arguments

You can specify input tasks, project config, machine learning backend and other options using the command line interface. Run `label-studio start --help` to see all available options.


### Authenticate with login and password
You can restrict access to Label Studio with basic HTTP authentication.

```
label-studio start my_project --username user --password pwd 
```

Or put `username` and `password` in the project config.json.
 
```
{ 
 ...
 "username": "user", 
 "password": "pwd",
 ...
}
```

> For docker you need to set up environment variables `USERNAME` and `PASSWORD`

It will be the same username and password for all the users.


### WSGIServer instead of Flask

Use `--use-gevent` option on start to enable WSGI server. It wraps around app.run with gevent's WSGIServer to enable the server to better handle concurrent requests.

```
label-studio start test --use-gevent
```

### HTTPS & SSL

You can enable https protocol for Flask or WSGIServer. You need to generate SSL certificate and key for it, e.g.: 

```
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out certificate.pem
```

Than you need to use `--cert` and `--key` option on start:

```
label-studio start test --cert certificate.pem --key key.pem
```


### Health check

LS has a special endpoint for health checks: 
  
```
/api/health
```