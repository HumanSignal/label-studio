# Label Studio

<img src="./images/heartex_icon_opossum_green.svg" align="right" title="Label Studio by Heartex Labs" height="140">

![GitHub](https://img.shields.io/github/license/heartexlabs/label-studio?logo=heartex) [![Build Status](https://travis-ci.com/heartexlabs/label-studio.svg?branch=master)](https://travis-ci.com/heartexlabs/label-studio) [![codecov](https://codecov.io/gh/heartexlabs/label-studio/branch/master/graph/badge.svg)](https://codecov.io/gh/heartexlabs/label-studio) ![GitHub release](https://img.shields.io/github/v/release/heartexlabs/label-studio?include_prereleases) [![Gitter](https://badges.gitter.im/label-studio/community.svg)](https://gitter.im/label-studio/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Label Studio is an open-source, configurable data annotation tool. Its purpose is to enable you to label different types of data using the most convenient interface with a standardized output format.

![Label Studio](./images/label-studio-examples.gif)

## Quick "I want to Label Guides:"

- [Classify text for sentiment](/examples/sentiment_analysis/START.md) ([screenshot](./images/screenshots/cts.png))
- [Named entities recognition](/examples/named_entity/START.md) ([screenshot](./images/screenshots/ner.png))
- [Transcribe audio](/examples/transcribe_audio/START.md) ([screenshot](./images/screenshots/audio-trans.png))
- [Classify audio](/examples/audio_classification/START.md) ([screenshot](./images/screenshots/audio-classify.png))
- [Conversational modeling & chatbots](/examples/chatbot_analysis/START.md) ([screenshot](./images/screenshots/chatbots.png))
- [Image object detection](/examples/image_bbox/START.md) ([screenshot](./images/screenshots/image-object.png))
- [Audio regions](/examples/audio_regions/START.md)<sup>New</sup> ([screenshot](./images/screenshots/audio-regions.png))

Coming Soon:

- Image line and points (screenshot)
- Image polygons (screenshot)
- Time series (screenshot)
- Video (screenshot)

## Table of Contents

- [Introduction](#introduction)
  - [Run Locally](#run-locally)
  - [Extend & Embed](#extend--embed)
- [Features](#features)
- [Using Label Studio](#using-label-studio)
- [Format](#format)
  - [Input](#input)
  - [Output](#output)
- [Contributing](#contributing)
- [License](#license)

## Introduction

Label Studio consists of two parts. The backend is a simple flask server that is used to load the data and save the results. The frontend is a [React](https://reactjs.org/) + [mobx-state-tree](https://github.com/mobxjs/mobx-state-tree) app that is backend agnostic and can be used separately, for example if you want to embed labeling into your applications.

### Run Locally

In order to launch the server locally, launch

```bash
cd backend
bash start.sh
```

To run it locally we include the compiled version of the frontend
part and an example implementation of the backend.

[Follow this guide for advanced usage & custom configuration](backend/README.md)

### Extend & Embed

To extend the functionality or embed the labeling inside your app, you need to be able to compile it from source.

[This guide explains how to do that](docs/Embed.md)

## Features

- Extensive UI configuration options
- Multiple datatypes supported: images, text, audios
- Hotkeys & History
- Converting to formats accepted by popular machine learning apps ([check here](/backend/converter/README.md) for supported GitHub repositories)

## Using Label Studio

### Config Language

Editor configuration is based on XML-like tags. Internally tags are represented by a react view and mobx-state-tree model. Each config should start with a `<View></View>` tag. Here is an example of a simple text classification config:

```jsx
<View>
  <Text name="text"></Text>
  <Choices name="choice" toName="text">
    <Choice value="relevant"></Choice>
    <Choice value="non relevant"></Choice>
  </Choices>
</View>
```

Note that we use tag names to connect tags between each other. Therefore tags that are used for labeling should include a name attribute. And every tag has its own set of parameters. Find more info in the related guide:

[Tags Documentation](/docs/Tags.md)

Creating your own tags is the suggested way to extend the app and tailor it to your specific needs.

## Format

### Input

Input should be JSON formatted. All the files that you want to label are expected to be hosted somewhere and provided as an URL to the JSON. The example backend server can process other formats, but it converts any format into JSON.

### Output

The output is JSON. Overall structure is the following:

```json
{
  "completions": [{
    "result": {
      "id": "yrSY-dipPI",
      "from_name": "sentiment",
      "to_name": "my_text",
      "type": "choices",
      "value": {
        "choices": ["Neutral"]
      }
    }
  }],
  "data": { "here are your task fields": "" }
}
```

Completion is an object with five mandatory fields:

- **id** unique id of the labeled region
- **from_name** name of the tag that was used to label region
- **to_name** name of the tag that provided the region to be labeled
- **type** type of the labeling/tag
- **value** tag specific value that includes the labeling result details

Want to use labeled data in your machine learning project, but get stuck to writing your parser? No worry, we are already
supporting multiple format converters, already adopted by popular machine learning libraries.
[Check it out!](/backend/converter/README.md)

## Contributing

- [Contributing Guideline](/CONTRIBUTING.md)
- [Code Of Conduct](/CODE_OF_CONDUCT.md)

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.net/).

<img src="./images/opossum_looking.svg" title="Hey everyone!" height="140">

