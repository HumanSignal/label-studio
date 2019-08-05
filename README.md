# Label Studio

<img src="./images/logo.png" align="right" title="Heartex Editor" width="100" height="100">

![GitHub](https://img.shields.io/github/license/heartexlabs/label-studio?logo=heartex) [![Build Status](https://travis-ci.com/heartexlabs/label-studio.svg?branch=master)](https://travis-ci.com/heartexlabs/label-studio)

Label Studio is an open-source, configurable data annotation tool. Its
purpose is to enable you to label different types of data using the
most convenient interface with the standardized output format.

## Quick "I want to Label Guides:"

- [Classify text for sentiment](/examples/sentiment_analysis/START.md) ([screenshot](./images/screenshots/cts.png))
- [Named entities recognition](/examples/named_entity/START.md) ([screenshot](./images/screenshots/ner.png))
- [Transcribe audio](/examples/transcribe_audio/START.md) ([screenshot](./images/screenshots/audio-trans.png))
- [Classify audio](/examples/audio_classification/START.md) ([screenshot](./images/screenshots/audio-classify.png))
- [Conversational modeling & chatbots](/examples/chatbot_analysis/START.md) ([screenshot](./images/screenshots/chatbots.png))
- [Image object detection](/examples/image_bbox/START.md) ([screenshot](./images/screenshots/image-object.png))

Coming Soon:
- Audio regions (screenshot)
- Image line and points (screenshot)
- Image polygons (screenshot)
- Time series (screenshot)
- Video (screenshot)

## Table of Contents

- [Introduction](#introduction)
  - [Run Locally](#run-locally)
  - [Extend & Embed](#extend--embed)
- [Using Label Studio](#using-label-studio)
- [Features](#features)
- [Contributing](#contributing)
- [License](#license)

## Introduction

Label Studio consists of two parts. Backend is a simple flask server
that is used to load the data and save the results. The frontend is a
[React](https://reactjs.org/) +
[MST](https://github.com/mobxjs/mobx-state-tree) app that is backend
agnostic and can be used separately, for example if you want to embed
labeling into your applications.

### Run Locally

In order to launch server locally, launch
```bash
cd backend
bash start.sh
```

To run it locally we include the compiled version of the frontend
part and an example implementation of the backend.

[Follow this guide for advanced usage & custom configuration](backend/README.md)

### Extend & Embed

To extend the functionality of embed the labeling inside your app, you
need to be able to compile it from the sources. 

[This guide explains how to do that](docs/Embed.md)

## Using Label Studio

### Config Language 

Editor configuration is based on XML-like tags. Internally tags are
represented by a react view and mobx-state-tree model. Each tag has a set of parameters, and you can look it up in the [documentation](/docs/Tags.md).

## Features

- Extensive UI configuration options
- Multiple datatypes supported: images, text, audios
- Hotkeys & History

## Contributing

- [Contributing Guideline](/CONTRIBUTING.md)
- [Code Of Conduct](/CODE_OF_CONDUCT.md)

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.net/).
