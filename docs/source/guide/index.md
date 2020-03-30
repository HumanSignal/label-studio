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
- **Completions** are the labeling results in [JSON format](completions.html#Completion-fields). They could be [exported](completions.html) in various common formats, ready to use in machine learning pipelines.
- **Predictions** are the optional labeling results in [the same format](completions.html#Completion-fields), but unlike completions they are used for generating pre-labeling during the annotation process, or validating the model predictions.
- [**Machine learning backend** connects](ml.html) popular machine learning frameworks to Label Studio for active learning & generating model predictions on-the-fly.
- **Labeling config** is a simple [XML tree with **tags**](setup.html#Labeling-config) used to configure UI elements, connect input data to output labeling scheme.
- **Project** encompasses tasks, config, predictions and completions all-in-one in an isolated directory
- **Frontend Labeling UI** is accessible from any browser, distributed as precompiled js/css scripts and could be [easily extendable with new labeling tags](frontend.html). You can also [embed Label Studio UI into your applications](frontend.html#Quickstart).


## Quickstart

### Prerequisites

Label Studio is supported for Python 3.5 or greater, running on Linux, Windows and MacOSX.

> Note: for Windows users the default installation may fail to build `lxml` package. Consider manually installing it from [unofficial Windows binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml) e.g. if you are running on x64 with Python 3.8, run `pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl`.


### Running with pip

To install Label Studio via pip, you need Python>=3.5 and run:
```bash
pip install label-studio
```

Then launch a new project which stores all labeling data in a local directory `my_labeling_project`:

```bash
label-studio start my_labeling_project --init
```
The default browser opens automatically at [http://localhost:8080](http://localhost:8080).


### Running with Docker

Label Studio is also distributed as a docker container. Make sure you have [Docker](https://www.docker.com/) installed on your local machine.

Install and start Label Studio at [http://localhost:8080](http://localhost:8080) storing all labeling data in `./my_labeling_project` directory:
```bash
docker run --rm -p 8080:8080 -v `pwd`/my_labeling_project:/label-studio/my_labeling_project --name label-studio heartexlabs/label-studio:latest
```

> Note: if `./my_labeling_project` the folder exists, an exception will be thrown. Please delete this folder or use `--force` option.
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

If you want to use nighty builds, or extend the functionality, consider to download the source code using Git and run Label Studio locally:

```bash
git clone https://github.com/heartexlabs/label-studio.git
cd label-studio
python setup.py develop
```

Then create a new project, it stores all labeling data in a local directory `my_labeling_project`:

```bash
label-studio start my_labeling_project --init
```
The default browser will open automatically at [http://localhost:8080](http://localhost:8080).


### Multisession mode

You can start Label Studio in _multisession mode_ - each browser session creates it's own project with associated session ID as a name.

In order to launch Label Studio in multisession mode and keep all projects in a separate directory `session_projects`, run

```bash
label-studio start-multi-session --root-dir ./session_projects
```


## Command line arguments

You can specify input tasks, project config, machine learning backend and other options via the command line interface. Run `label-studio start --help` to see all available options.
