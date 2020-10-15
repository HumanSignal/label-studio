# Label Studio &middot; ![GitHub](https://img.shields.io/github/license/heartexlabs/label-studio?logo=heartex) ![label-studio:build](https://github.com/heartexlabs/label-studio/workflows/label-studio:build/badge.svg) ![code-coverage](https://github.com/heartexlabs/label-studio/blob/master/.github/test-coverage.svg) ![GitHub release](https://img.shields.io/github/v/release/heartexlabs/label-studio?include_prereleases) &middot;

[Website](https://labelstud.io/) • [Docs](https://labelstud.io/guide/) • [Twitter](https://twitter.com/heartexlabs) • [Join Slack Community <img src="https://app.heartex.ai/docs/images/slack-mini.png" width="18px"/>](https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw)

<br/>

# Label Studio is Swiss army knife of data labeling and annotation tools :v:
 
Read the [introductory post](https://towardsdatascience.com/introducing-label-studio-a-swiss-army-knife-of-data-labeling-140c1be92881#3907-fd502dc24c8d). And try the [Label Studio demo](https://app.labelstud.io). 
 
Label Studio is designed to help you label different types of data using a simple interface and standardized output. Don't worry about making your own  tool for a custom data set. Use Label Studio to save time and remain flexible.

<br/>

![](https://raw.githubusercontent.com/heartexlabs/label-studio/master/images/annotation_examples.gif)

## Summary

<img align="right" height="180" src="https://github.com/heartexlabs/label-studio/blob/master/images/heartex_icon_opossum_green@2x.png?raw=true" />

- [Quick Start](#quick-start)
- [One Click Deploy](#one-click-deploy)
- [Features :star2:](#features-star2)
- [Use Cases](#use-cases)
- [Machine Learning Integration](#machine-learning-integration)
- [For Teams and Enterprises :office:](#label-studio-for-teams-startups-and-enterprises-office)
- [Ecosystem](#ecosystem)
- [License](#license)

## Quick Start

Installation requires Python3.5 or greater.

```bash

pip install label-studio

# Initialize the project in labeling_project path

label-studio init labeling_project

# Start the server at http://localhost:8080

label-studio start labeling_project
```

## Windows 

1. For Windows, you must download and install the following wheel packages *manually* from [Gohlke builds](https://www.lfd.uci.edu/~gohlke/pythonlibs)
Go to [lxml](https://www.lfd.uci.edu/~gohlke/pythonlibs/#lxml) to download the packages. 
Use ``python --version`` to ensure that you are using the *same version of python* when selecting wheel (.WHL) packages. 

2. Install Label Studio using Pip:
 
```bash

# Upgrade pip 

pip install -U pip

# Assuming you are running Win64 with Python 3.8, install packages downloaded form Gohlke:

pip install lxml‑4.5.0‑cp38‑cp38‑win_amd64.whl

# Install label studio

pip install label-studio

```

## Anaconda

```bash

conda create --name label-studio python=3.8
conda activate label-studio
pip install label-studio

```

If any errors appear, try again and rerun the installation with the ``--ignore-installed`` flag.

```bash

pip install --ignore-installed label-studio

```

## Local development

Run latest version Label Studio locally for development:

```bash

# Instal dependencies

pip install -e

# Start the server at http://localhost:8080

python label_studio/server.py start labeling_project --init

```

---

## Run as Docker container

Run Label-Studio as a Docker container. 
In this example, access the interface at `http://localhost:8080`:

```bash
docker run --rm -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest label-studio start my_project --init
```

In this example, a new project folder called my_project/ is created in the working directory.

```bash

# Newly created project 

ls ./my_project 

completions  config.xml   tasks.json
config.json  source.json

```

**Note**: The script will not override existing folders.  If `./my_project` folder exists, the script will not complete successfully. To overwrite and existing folder,m use the `--force` flag.

You can override the default startup command by appending ``--force --template PATHTOTEMPLATE`` 


```bash

docker run -p 8080:8080 -v `pwd`/my_project:/label-studio/my_project --name label-studio heartexlabs/label-studio:latest label-studio start my_project --init --force --template text_classification

```

If you want to build a local image, run:

```bash
sudo docker build -t heartexlabs/label-studio:latest .
```

## Use docker-compose

You can also start serving at `http://localhost:8080` using docker-compose.


### First time to run the app

Install docker-compose and run:

```bash

sudo INIT_COMMAND='--init' docker-compose up -d

```

### Run the app with existing project data

```bash

docker-compose up -d

```

### Run the app resetting project data

```bash
INIT_COMMAND='--init --force' docker-compose up -d
```

Or you can just use .env file instead of INIT_COMMAND='...' adding this line:

```bash
INIT_COMMAND=--init --force
```
## Embed

Label studio is available as an [NPM package](https://github.com/heartexlabs/label-studio-frontend) tool for easy inclusion in your projects.


## One Click Deploy

Deploy Label Studio with one click through these cloud app platforms.

[<img src="https://www.herokucdn.com/deploy/button.svg" height="30px">](https://heroku.com/deploy)
[<img src="https://aka.ms/deploytoazurebutton" height="30px">](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fheartexlabs%2Flabel-studio%2Fmaster%2Fazuredeploy.json)
[<img src="https://deploy.cloud.run/button.svg" height="30px">](https://deploy.cloud.run)



## Amazon S3 Google GCS 

[Read more](https://labelstud.io/blog/release-070-cloud-storage-enablement.html) about Cloud Storages Support and release 0.7.0.

## Features :star2:

- **Simple**: Elegant and minimal designed for usability.
- **Configurable**: Use JSX tags to quickly build and customize the visual interface for your specific data needs. 
- **Collaborative**: Assign (?label) tasks your team and compare to two or more people and compare the results. 
- **Use for multiple data types**: Make labels unique or images, audio, text, markup and code with custom lab definitions.
- **Import multiple formats**: Label studio supports importing JSON, CSV, TSV, RAR, and ZIP formats.
- **Mobile-Friendly**: Mobile friendly interface available for many devices.
- **Machine Learning**: Supports integration with machine learning tools. Visualize and compare predictions based on different models before you label. 
- **Customize**: Add custom branding and  distribute the labeling tasks as a part of your product.

## Use Cases

The follow is a list of supported use cases for data annotation. 
You are welcome to share your own config files and extend the base types to support more scenarios. 
This list is not exhaustive but it includes many major scenarios.

| Task | Description |
|-|-|
| **Image** | | 
| [Classification](https://labelstud.io/templates/image_classification.html) | Sort images into categories |
| Object Detection | Detect image  objects using a bounding box or polygons |
| Semantic Segmentation | Detect object category for each pixel | 
| Pose Estimation | Mark positions of a person’s joints |
| **Text** | | 
| [Classification](https://labelstud.io/templates/sentiment_analysis.html) | Sort text into categories |
| Summarization | Create a summary that represents the most relevant information from the original content |
| HTML Tagging | Annotate things like resumes, research, legal papers, and excel sheets converted to HTML | 
| **Audio** | |
| [Classification](https://labelstud.io/templates/audio_classification.html) | Sort audio into categories |
| Speaker Diarization | Separate different speakers in an audio recording | 
| Audio-based Emotion Recognition | Tag and identify emotion from audio |
| Transcription | Automatically generate a text versions of from recorded audio |
| **Video** | |
| [Classification](https://labelstud.io/templates/video_classification.html) | Put videos into categories | 
| **Comparison** | |
| Pairwise | Comparing entities in pairs to judge which of each entity is preferred | 
| Ranking | Sort items in the list according to some property |

## Machine Learning Integration

Connect your favorite machine learning framework with Label Studio's Machine Learning SDK in 2 simple steps.

1. Start your own ML backend server; [check here for detailed instructions](label_studio/ml/README.md).

2. Connect Label Studio to the running ML backend on the [/model](http://localhost:8080/model.html) page.

This gives you the opportunities to use:

- **Pre-labeling** and make use on-the-fly model predictions for creating rough image segmentations for further manual refinements.
- **Autolabeling** to create automatic annotations.
- **Online Learning** to simultaneously update or retrain your models as new annotations appear.
- **Active Learning** and select only most complex examples.
- **Prediction Service** and instantly create live production-ready prediction service

## Label Studio for Teams, Startups, and Enterprise :office:

Label Studio is available for teams with our enterprise edition (available in cloud & on-prem). 
It includes a data manager, high-quality baseline models, active learning, collaboration tools, and much more. 
Visit the [Heartex website](https://www.heartex.ai/) to learn more.

## Ecosystem

| Project | Description |
|-|-|
| label-studio | Server component distributed as a pip package |
| [label-studio-frontend](https://github.com/heartexlabs/label-studio-frontend) | Frontend JavaScript component and React. Embed label-studio in your project | 
| [label-studio-converter](https://github.com/heartexlabs/label-studio-converter) | Encode labels for your favorite machine learning libraries | 
| [label-studio-transformers](https://github.com/heartexlabs/label-studio-transformers) | Connect the Transformers Python library use with label studio | 

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
  year={2020},
}
```

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.ai/). 2020

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />
