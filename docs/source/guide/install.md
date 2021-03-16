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
docker run -p 8080:8080 -v `pwd`/mydata:/root/.local/share/label-studio/ heartexlabs/label-studio:latest
```

### Install with Docker on Windows
Or for Windows, you have to modify the volumes paths set by `-v` option.

#### Override the default Docker install
You can override the default Docker install by appending new arguments: 
```bash
docker run -p 8080:8080 -v `pwd`/mydata:/root/.local/share/label-studio/ heartexlabs/label-studio:latest label-studio --log-level DEBUG
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










