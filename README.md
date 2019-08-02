# Label Studio

<img src="./images/logo.png" align="right" title="Heartex Editor" width="100" height="100">

![GitHub](https://img.shields.io/github/license/heartexlabs/label-studio?logo=heartex) [![Build Status](https://travis-ci.com/shevchenkonik/editor-readme.svg?token=ds22yQDmPNgvZgqrpDKv&branch=master)](https://travis-ci.com/shevchenkonik/editor-readme)

Label Studio is an open-source, configurable data annotation tool. Its
purpose is to enable you to label different types of data using the
most convinient interface with the standardized output format.

## Quick "I want to Label Guides:"

- [Classify Text for Sentiment](/examples/sentiment_analysis/START.md) ([screenshot](https://user.fm/files/v2-c739eea809a0fde9c90675a2396f577e/Screen%20Shot%202019-08-01%20at%209.17.04%20PM.png))
- [NER for Text](/examples/named_entity/START.md) ([screenshot](https://user.fm/files/v2-cfb599a352fe6c17d209599ce95e7e25/Screen%20Shot%202019-08-01%20at%209.48.24%20PM.png))
- [Transcribe Audio](/examples/transcribe_audio/START.md) ([screenshot](https://user.fm/files/v2-e1f1d31d32db73c07d20a96a78758623/Screen%20Shot%202019-08-01%20at%209.39.54%20PM.png))
- [Classify Audio](/examples/audio_classification/START.md) ([screenshot](https://user.fm/files/v2-70ded6823222ef7f5291482df9ce39c2/Screen%20Shot%202019-08-01%20at%209.21.12%20PM.png))
- [Chatbot Analysis](/examples/chatbot_analysis/START.md) ([screenshot](https://user.fm/files/v2-cb81c8aaa30170724ea19e3af7218fc8/Screen%20Shot%202019-08-01%20at%209.27.14%20PM.png))
- [Image Bbox](/examples/image_bbox/START.md) ([screenshot](https://user.fm/files/v2-04a15361580d038bd9392a225e2569e4/Screen%20Shot%202019-08-01%20at%2011.38.16%20PM.png))

Coming Soon:
- Audio Regions (screenshot)
- Image Line and Points (screenshot)
- Image Polygons (screenshot)
- Time Series (screenshot)
- Video (screenshot)

## Table of Contents

- [Getting Started](#getting-started)
  - [Run Locally](#run-locally)
  - [Embedding in your application](#embedding-in-your-application)
- [Using Label Studio](#using-label-studio)
- [Features](#features)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

Label Studio consists of two parts. Backend is a simple flask server
that is used to load the data and save the results. The frontend is a
[React](https://reactjs.org/) +
[MST](https://github.com/mobxjs/mobx-state-tree) app that is backend
agnostic and can be used separately, for example if you want to embed
labeling into your applications.

### Run Locally

To run it locally we're including the compiled version of the frontend
part and example implementation of the backend. 

[Follow this guide to start the app](backend/README.md)

### Embedding in your application

Clone this repository and install all dependencies:

```bash
git clone git@github.com:heartexlabs/label-studio.git
cd label-studio
npm install
```

Now you can make any changes to the code or add your custom tags.

#### Run a development build

```bash
npm run start
```

And open your browser at http://localhost:3000

#### Run a production build

```bash
npm run build
```

Generates the compiled version of label studio. This compiled version needs to be included into your app.

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
