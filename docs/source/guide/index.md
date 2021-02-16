---
title: Getting started
type: guide
order: 100
---

## Overview

Label Studio is a self-contained Web application for multi-typed data labeling and exploration. The _backend_ is written in pure Python powered by [Flask](https://github.com/pallets/flask). The _frontend_ part is a backend-agnostic [React](https://reactjs.org/) + [MST](https://github.com/mobxjs/mobx-state-tree) app, included as a precompiled script.

Here are the main concepts behind Label Studio's workflow:

<div style="margin:auto; text-align:center; width:100%"><img src="/images/label-studio-ov.jpg" style="opacity: 0.7"/></div>

- **Tasks** represent an individual dataset items. Label Studio is a multi-type labeling tool - you can [import](tasks.html) either text, image, audio URL, HTML text or any number and combination of these data resources.
- **Completions** are the labeling results in [JSON format](export.html#Completion-fields). They could be [exported](export.html) in various common formats, ready to use in machine learning pipelines.
- **Predictions** are the optional labeling results in [the same format](export.html#Completion-fields), but unlike completions they are used for generating pre-labeling during the annotation process, or validating the model predictions.
- [**Machine learning backend** connects](ml.html) popular machine learning frameworks to Label Studio for active learning & generating model predictions on-the-fly.
- **Labeling config** is a simple [XML tree with **tags**](setup.html#Labeling-config) used to configure UI elements, connect input data to output labeling scheme.
- **Project** encompasses tasks, config, predictions and completions all-in-one in an isolated directory
- **Frontend Labeling UI** is accessible from any browser, distributed as precompiled js/css scripts and could be [easily extendable with new labeling tags](frontend.html). You can also [embed Label Studio UI into your applications](frontend.html#Quickstart).


### Main modules

The main modules of LS are 
* [Label Studio Backend](https://github.com/heartexlabs/label-studio/) (LSB, main repository)
* [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend) (LSF, editor)
* [Machine Learning Backends](https://github.com/heartexlabs/label-studio/tree/master/label_studio/ml) (MLB)

<br>
<div style="margin:auto; text-align:center;"><img src="/images/ls-modules-scheme.png" style="opacity: 0.8"/></div>

### Relations among tasks, completions and results 

Here you can see relations among labeling objects: tasks, completions, results, etc.

One user provides one completion, it’s atomic, and it consists of the result items. Result items can have relations between themselves with the specified direction of three types: left-right, right-left, or bidirectional. Normalizations are additional information in the custom string format about the current result item.
 
<br>
<center><img src="/images/labeling-scheme.png" style="width: 100%; opacity: 0.6"></center>
<br>
Completions and Predictions are very similar. But predictions must be generated automatically by ML models.   

**Usage statistics**

Label Studio collects anonymous usage statistics without any sensitive info about page request number and data types from the labeling config. It helps us to improve the labeling quality and gives a better understanding about the next development.


## Quickstart

### Prerequisites

Label Studio is supported for Python 3.5 or greater, running on Linux, Windows and MacOSX.

> Note: for Windows users the default installation may fail to build `lxml` package. Consider manually installing it from [unofficial Windows binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml) e.g. if you are running on x64 with Python 3.8, run `pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl`.


### Running with pip

To install Label Studio via pip, you need Python>=3.5 and run:
```bash
pip install label-studio
```

Then launch a new project which stores all labeling data in a local directory `my_project`:

```bash
label-studio start my_project --init
```
The default browser opens automatically at [http://localhost:8080](http://localhost:8080).


### Running with Docker

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

### Running from source

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


### Multisession mode

You can start Label Studio in _multisession mode_. The each browser session will create a new project and associate it with session ID.

You can switch between multiple projects and share them to other users. All this functionality can be found on `Settings` page in `Project Management` section. 

In order to launch Label Studio in multisession mode and keep all projects in a separate directory `session_projects`, run

```bash
label-studio start-multi-session --root-dir ./session_projects
```


## Command line arguments

You can specify input tasks, project config, machine learning backend and other options via the command line interface. Run `label-studio start --help` to see all available options.


### Auth with login and password
You can restrict the access for LS instance with the basic HTTP auth.

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

> For docker you need to setup environment variables `USERNAME` and `PASSWORD`

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