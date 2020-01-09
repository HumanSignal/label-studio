---
title: Getting started
type: guide
order: 100
---

Label Studio is a data labeling and annotation tool. Unlike other tools, Label Studio is designed from the ground up to be incrementally extensible and adaptable for different data labeling needs. It works with different data types, mobile-friendly, and can be easily integrated into your pipelines.

Label Studio consists of two parts. Backend is a simple flask server that is used to load the data and save the results. The frontend is a [React](https://reactjs.org/) + [MST](https://github.com/mobxjs/mobx-state-tree) app that is backend agnostic and can be used separately, for example, if you want to embed labeling into your applications.

## Install

#### Prerequisites

Label Studio is supported for Python 3.6 or greater.


#### Install from pip

To install Label Studio via pip, you need Python>=3.6 and run:
```bash
pip install label-studio
```

#### Install from source

To install Label Studio locally from source, run

```bash
git clone https://github.com/heartexlabs/label-studio.git
cd label-studio/backend/
pip install -e .
```

## Basic usage

For launching preconfigured Label Studio server with interactive prompt, just run in your terminal:
```bash
label-studio
```

You'll be prompted about:

- Path to a file that contains input tasks to be labelled. Read more about expected [input formats](format.md#input)
- Path to an output directory where labeling results will be stored. Read more about [output formats](format.md#output)
- Path to a XML-formatted file that contains configuration for your labels and labeling UI. Please explore [available templates](../templates), preconfigured [examples](../../../examples), try them out in our [playground](../playground) and check detailed [documentation](../tags) about all configuration options. 

After all steps passed, your default browser will be automatically opened. If it's not happened, open manually `http://localhost:8200`.

## Advanced usage
The aforementioned command starts Label Studio server with precompiled frontend library and server config specified in [config.json](../../../backend/label_studio/config.json).
You can also similarly start Label Studio without interactive prompt by calling
```bash
python server.py -c config.json
```

You can modify settings contained in default _config.json_. Read more in [reference]()

#### Ready for More?

We've briefly introduced essential features of label studio core, but there are a lot other interesting things you can do with Label Studio!
 
 Check our docs if you want to learn about how to:
- [extend and build UI frontend part by your own](frontend.md)
- [embed Label Studio into your application](frontend.md)
- [integrate machine learning frameworks for active learning & prelabeling](ml.md)
- [run in the cloud by using docker container](?)
