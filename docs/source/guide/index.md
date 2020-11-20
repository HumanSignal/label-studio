---
title: Installation
type: guide
order: 100
---

Label Studio is supported for Python 3.5 or greater, running on Linux, Windows and MacOSX.

> Note: for Windows users the default installation may fail to build `lxml` package. Consider manually installing it from [unofficial Windows binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml) e.g. if you are running on x64 with Python 3.8, run `pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl`.

> Note: On Windows we recommend to use Python 3.5 - 3.8. Python 3.9 has not all pre-built packages for Windows. 

## Running with pip

To install Label Studio via pip, you need Python>=3.5 and run:
```bash
pip install label-studio
```

Then launch a new project which stores all labeling data in a local directory `my_project`:

```bash
label-studio start my_project --init
```
The default browser opens automatically at [http://localhost:8080](http://localhost:8080).


## Running with Docker

Label Studio is also distributed as a docker container. Make sure you have [Docker](https://www.docker.com/) installed on your local machine.

Install and start Label Studio at [http://localhost:8080](http://localhost:8080) storing all labeling data in `./my_project` directory:
```bash
docker run --rm -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest
```

> Note: if `./my_project` the folder exists, an exception will be thrown. Please delete this folder or use `--force` option.
> Note: for Windows, you have to modify the volumes paths set by `-v` option

You can override the default startup command by appending any of [available command line arguments]():

```bash
docker run -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest label-studio start my_project --init --force --template image_mixedlabel
```

If you want to build a local image, run:
```bash
docker build -t heartexlabs/label-studio:latest .
```

## Running from source

If you want to use nightly builds, or extend the functionality, consider to download the source code using Git and run Label Studio locally:

```bash
git clone https://github.com/heartexlabs/label-studio.git
cd label-studio
python setup.py develop
```

Then create a new project, it stores all labeling data in a local directory `my_project`:

```bash
label-studio start my_project --init
```
The default browser will open automatically at [http://localhost:8080](http://localhost:8080).
