---
title: Introduction
type: guide
order: 100
---

## What is Label Studio?

Label Studio is a data labeling and annotation tool. Unlike other tools, Label Studio is designed from the ground up to be incrementally extensible and adaptable for different data labeling needs. It works with different data types, mobile-friendly, and can be easily integrated into your pipelines.

## Getting Started

Label Studio consists of two parts. Backend is a simple flask server that is used to load the data and save the results. The frontend is a [React](https://reactjs.org/) + [MST](https://github.com/mobxjs/mobx-state-tree) app that is backend agnostic and can be used separately, for example, if you want to embed labeling into your applications.


## Run

To launch the backend server locally, do
```bash
cd backend
bash start.sh
```

To run it locally we include the compiled version of the frontend part and an example implementation of the backend. That bash script initializes python environment, installs dependencies and starts an example python server.

## Ready for More?

We've briefly introduced essential features of label studio core - the rest of this guide will cover them and other advanced features with much finer details, so make sure to read through it all!
