<img src="https://raw.githubusercontent.com/heartexlabs/label-studio/master/images/github.png"/>

![GitHub](https://img.shields.io/github/license/heartexlabs/label-studio?logo=heartex) ![label-studio:build](https://github.com/heartexlabs/label-studio/workflows/label-studio:build/badge.svg) ![code-coverage](https://github.com/heartexlabs/label-studio/blob/master/.github/test-coverage.svg) ![GitHub release](https://img.shields.io/github/v/release/heartexlabs/label-studio?include_prereleases)

[Website](https://labelstud.io/) • [Docs](https://labelstud.io/guide/) • [Twitter](https://twitter.com/heartexlabs) • [Join Slack Community <img src="https://app.heartex.ai/docs/images/slack-mini.png" width="18px"/>](https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw)


## What is Label Studio?

Label Studio is an open source data labeling tool. It lets you label data types like audio, text, images, videos, and time series with a straightforward interface and standardized output formats. 

- [Try out Label Studio](#try-out-label-studio)
- [What you get from Label Studio](#what-you-get-from-label-studio)
- [Included templates for labeling data in Label Studio](#included-templates-for-labeling-data-in-label-studio)
- [Set up machine learning models with Label Studio](#set-up-machine-learning-models-with-Label-Studio)
- [Integrate Label Studio with your existing tools](#integrate-label-studio-with-your-existing-tools)

![Gif of Label Studio annotating different types of data](https://raw.githubusercontent.com/heartexlabs/label-studio/master/images/annotation_examples.gif)

Have a custom dataset? You can customize Label Studio to fit your needs. Read an [introductory blog post](https://towardsdatascience.com/introducing-label-studio-a-swiss-army-knife-of-data-labeling-140c1be92881#3907-fd502dc24c8d) to learn more. 

## Try out Label Studio

Try out Label Studio in a **[running app](https://app.labelstud.io)**, install it locally, or deploy it in a cloud instance. 

- [Install locally with Docker](#install-locally-with-docker)
- [Run with Docker Compose](#run-with-docker-compose)
- [Install locally with pip](#install-locally-with-pip)
- [Install locally with Anaconda](#install-locally-with-anaconda)
- [Install for local development](#install-for-local-development)
- [Deploy in a cloud instance](#deploy-in-a-cloud-instance)

### Install locally with Docker
Run Label Studio in a Docker container and access it at `http://localhost:8080`.

```bash
docker run --rm -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest label-studio start my_project --init
```
#### Override default Docker install
By default, the default Docker install command creates a blank project in a `./my_project` directory. If the `./my_project` folder already exists, Label Studio fails to start. Rename or delete the folder, or use the `--force` argument to force Label Studio to start: 

```bash
docker run -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest label-studio start my_project --init --force --template text_classification
```

#### Build a local image with Docker
If you want to build a local image, run:
```bash
docker build -t heartexlabs/label-studio:latest .
```

### Run with Docker Compose
Use Docker Compose to serve Label Studio at `http://localhost:8080`.

Run this command the first time you run Label Studio:
```bash
INIT_COMMAND='--init' docker-compose up -d
```

Start Label Studio after you have an existing project:
```bash
docker-compose up -d
```

Start Label Studio and reset all project data: 
```bash
INIT_COMMAND='--init --force' docker-compose up -d
```
You can also set environment variables in the .env file instead of specifying INIT_COMMAND. For example, add this line have the option to reset all project data when starting Label Studio:
```bash
INIT_COMMAND=--init --force
```

### Install locally with pip

```bash
# Requires >=Python3.5, Python 3.9 is not yet supported
pip install label-studio

# Initialize the project in labeling_project path
label-studio init labeling_project

# Start the server at http://localhost:8080
label-studio start labeling_project
```

### Install locally with Anaconda

```bash
conda create --name label-studio python=3.8
conda activate label-studio
pip install label-studio
```

### Install for local development

You can run the latest Label Studio version locally without installing the package with pip. 

```bash
# Install all package dependencies
pip install -e .
```
```bash
# Start the server at http://localhost:8080
python label_studio/server.py start labeling_project --init
```

### Deploy in a cloud instance

You can deploy Label Studio with one click in Heroku, Microsoft Azure, or Google Cloud Platform: 

[<img src="https://www.herokucdn.com/deploy/button.svg" height="30px">](https://heroku.com/deploy)
[<img src="https://aka.ms/deploytoazurebutton" height="30px">](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fheartexlabs%2Flabel-studio%2Fmaster%2Fazuredeploy.json)
[<img src="https://deploy.cloud.run/button.svg" height="30px">](https://deploy.cloud.run)

### Troubleshoot installation
If you see any errors during installation, try to rerun the installation

```bash
pip install --ignore-installed label-studio
```

#### Install dependencies on Windows 
To run Label Studio on Windows, download and install the following wheel packages from [Gohlke builds](https://www.lfd.uci.edu/~gohlke/pythonlibs) to ensure you're using the correct version of python:
- [lxml](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml)

```bash
# Upgrade pip 
pip install -U pip

# If you're running Win64 with Python 3.8, install the packages downloaded from Gohlke:
pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl

# Install label studio
pip install label-studio
```

## What you get from Label Studio
When you use Label Studio to annotate and label your data, you get a lot of functionality and flexibility. 

- **Streamlined design** helps you focus on your task, not how to use the software.
- **Configurable label formats** let you customize the visual interface to meet your specific labeling needs.
- **Support for multiple data types** including images, audio, text, HTML, time-series, and video. 
- **Import from files or from cloud storage** in Amazon AWS S3, Google Cloud Storage, or JSON, CSV, TSV, RAR, and ZIP archives. 
- **Multiple device support** with a flexible interface supported on devices of different sizes, from smartphones and tablets to large monitors.
- **Integration with machine learning models** so that you can visualize and compare predictions from different models and perform pre-labeling.
- **Embed it in your existing tools** so that you don't have to change your workflow to start using Label Studio. The frontend is available as an [NPM package](https://github.com/heartexlabs/label-studio-frontend).

![Screenshot of Label Studio data manager grid view with images](https://raw.githubusercontent.com/heartexlabs/label-studio/master/images/aerial_training_data_management.png)

## Included templates for labeling data in Label Studio 

Label Studio includes a variety of templates to help you label your data, or you can contribute your own. The most common templates and use cases for labeling include the following tasks:

| Task | Description |
|----|----|
| **Images** | | 
| [Classification](https://labelstud.io/templates/image_classification.html) | Categorize images |
| Object Detection | Identify objects in an image using a bounding box or polygons |
| Semantic Segmentation | Detect the object category for each pixel in an image | 
| Pose Estimation | Mark the positions of a person’s joints |
| **Text** | | 
| [Classification](https://labelstud.io/templates/sentiment_analysis.html) | Categorize the content or sentiment of text |
| Summarization | Create a summary that represents the most relevant information within the original content |
| HTML Tagging | Annotate things like webpages, as well as resumes, research, legal papers, and spreadsheets converted to HTML | 
| [Named Entity Recognition](https://labelstud.io/templates/named_entity.html) | Annotate specific portions of text |
| **Audio** | |
| [Classification](https://labelstud.io/templates/audio_classification.html) | Categorize audio content |
| Speaker Diarisation | Partition an audio stream into homogeneous segments according to the speaker identity | 
| Emotion Recognition | Tag and identify the emotion in the audio |
| [Transcription](https://labelstud.io/templates/transcribe_audio.html) | Convert the speech in the audio to text |
| **Video** | |
| [Classification](https://labelstud.io/templates/video_classification.html) | Put videos into categories | 
| **Comparison** | |
| [Pairwise](https://labelstud.io/templates/pairwise_comparison.html) | Comparing entities in pairs to judge which of each entity is preferred | 
| Ranking | Sort items in the list according to some property |
| **Time Series** | |
| [Classification](https://labelstud.io/templates/time_series.html) | Categorize the types of events occurring over time |
| Segmentation | Separate the portions of a time series event in a useful way |


## Set up machine learning models with Label Studio

Connect your favorite machine learning framework using the Label Studio Machine Learning SDK. Follow these steps:
1. Start your own machine learning backend server. See [more detailed instructions](label_studio/ml/README.md),
2. Connect Label Studio to the running machine learning backend on the [/model](http://localhost:8080/model.html) page in Label Studio.

- **Pre-label** your data using model predictions. 
- **Automatically annotate** your data. 
- Do **online learning** and retrain your model while new annotations are being created. 
- Do **active learning** by labeling only the most complex examples in your data.
- Set up a **prediction service** that is ready for production. 


## Integrate Label Studio with your existing tools

You can use Label Studio as an independent part of your machine learning workflow or integrate the frontend or backend into your existing tools.  

* Use the [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend) as a separate React library. See more in the [Frontend Library documentation](https://labelstud.io/guide/frontend.html). 
* Use Flask Blueprints to integrate the Label Studio Backend (this repo) into your app. See [an example of this integration](https://github.com/heartexlabs/label-studio/blob/master/blueprint_usage_example.py).

## Ecosystem

| Project | Description |
|-|-|
| label-studio | Server, distributed as a pip package |
| [label-studio-frontend](https://github.com/heartexlabs/label-studio-frontend) | React and JavaScript frontend and can run standalone in a web browser or be embedded into your application. |  
| [data-manager](https://github.com/heartexlabs/dm2) | React and JavaScript frontend for managing data. Includes the Label Studio Frontend. Relies on the label-studio server or a custom backend with the expected API methods. | 
| [label-studio-converter](https://github.com/heartexlabs/label-studio-converter) | Encode labels in the format of your favorite machine learning library | 
| [label-studio-transformers](https://github.com/heartexlabs/label-studio-transformers) | Transformers library connected and configured for use with Label Studio |


## Citation

```tex
@misc{Label Studio,
  title={{Label Studio}: Data labeling software},
  url={https://github.com/heartexlabs/label-studio},
  note={Open source software available from https://github.com/heartexlabs/label-studio},
  author={
    Maxim Tkachenko and
    Mikhail Malyuk and
    Nikita Shevchenko and
    Andrey Holmanyuk and
    Nikolai Liubimov},
  year={2020-2021},
}
```

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.ai/). 2020-2021

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />
