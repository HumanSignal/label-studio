---
title: Getting started
type: guide
order: 100
---

Label Studio is a data labeling and annotation tool. Unlike other tools, Label Studio is designed from the ground up to be incrementally extensible and adaptable for different data labeling needs. It works with different data types, mobile-friendly, and can be easily integrated into your pipelines.

Label Studio consists of two parts. Server is a flask server that provides a **complete data labeling soltion** that consists of data management interface (import & export), initialization of the frontend and integrations with machine learning libraries for the assisted labeling. The frontend is a [React](https://reactjs.org/) + [MST](https://github.com/mobxjs/mobx-state-tree) app that is backend agnostic and can be used separately, for example, if you want to embed labeling into your applications.

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
cd label-studio
pip install -e .
```

## Usage

First create a new labeling project:

```bash
label-studio init labeling_project
```

To launch Label Studio server, just run in your terminal:

```bash
label-studio start labeling_project
```

Now open up [http://localhost:8200](http://localhost:8200) in your browser.

#### Ready for More?

We've briefly introduced essential features of label studio core, but there are a lot other interesting things you can do with Label Studio!
 
 Check our docs if you want to learn about how to:
- [extend and build UI frontend part](frontend.html)
- [embed Label Studio into your applications](frontend.html#Quickstart)
- [integrate machine learning frameworks for active learning & prelabeling](ml.html)
