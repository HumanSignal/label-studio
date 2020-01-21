# Label Studio &middot; ![GitHub](https://img.shields.io/github/license/heartexlabs/label-studio?logo=heartex) [![Build Status](https://travis-ci.com/heartexlabs/label-studio.svg?branch=master)](https://travis-ci.com/heartexlabs/label-studio) [![codecov](https://codecov.io/gh/heartexlabs/label-studio/branch/master/graph/badge.svg)](https://codecov.io/gh/heartexlabs/label-studio) ![GitHub release](https://img.shields.io/github/v/release/heartexlabs/label-studio?include_prereleases) &middot; :sunny:

[Website](https://labelstud.io/) • [Docs](https://labelstud.io/guide) • [Twitter](https://twitter.com/heartexlabs) • [Join Slack Community <img src="https://go.heartex.net/docs/images/slack-mini.png" width="18px"/>](https://docs.google.com/forms/d/e/1FAIpQLSdLHZx5EeT1J350JPwnY2xLanfmvplJi6VZk65C2R4XSsRBHg/viewform?usp=sf_link)

<br/>

 **Label Studio is a swiss army knife of data labeling and annotation tools :v:**
 
Try it now in [running app](https://app.labelstud.io)!
 
Its purpose is to help you label different types of data using a simple interface with a standardized output format. You're dealing with the custom dataset and thinking about creating your tool? Don't - using Label Studio, you can save time and create a custom tool and interface in minutes. 

![Label Studio](https://raw.githubusercontent.com/heartexlabs/label-studio/master/images/label-studio-examples.gif)

<br/>

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

```bash
# Requires >=Python3.5
pip install label-studio

# Initialize the project in labeling_project path
label-studio init labeling_project

# Start the server at http://localhost:8200
label-studio start labeling_project
```

#### Install on Windows  
It's not necessary to install Visual Studio Compiler, 
just download "regex" (or other packages you need to compile) from gholke builds corresponding to your python version: 
https://www.lfd.uci.edu/~gohlke/pythonlibs/#regex

and then 
 
```bash
# Upgrade pip 
pip install -U pip

# Install regex
pip install <path-to-downloaded-package>.whl

# Install label studio
pip install label-studio
```

#### Local development
Running the latest Label Studio version locally without installing package from pip could be done by:
```bash
# Install all package dependencies
pip install -e .
```
```bash
# Start the server at http://localhost:8200
python label-studio/server.py start labeling_project --init
```

## Run docker
You can also start serving at `http://localhost:8200` by using docker:
```bash
docker start --rm -p 8200:8200 heartexlabs/label-studio:latest
```

If you want to build a local image, run:
```bash
docker build -t heartexlabs/label-studio:latest .
```


## One Click Deploy

[<img src="https://www.herokucdn.com/deploy/button.svg" height="30px">](https://heroku.com/deploy)
[<img src="https://azurecomcdn.azureedge.net/mediahandler/acomblog/media/Default/blog/deploybutton.png" height="30px">](https://azuredeploy.net/)
[<img src="https://deploy.cloud.run/button.svg" height="30px">](https://deploy.cloud.run)

## Features :star2:

- **Simple**: Crafted with minimal UI design. A simple design is the best design.
- **Configurable**: Using high-level jsx tags config, you can fully customize the visual interface for your data. It feels like building a custom labeling tool for your specific needs. And it's fast to do.
- **Collaborative Annotations**: Label the same task by two or more people and compare the results. 
- **Multiple Data Types**: Label _Images_, _Audios_, _Texts_, _HTMLs_, _Pairwise_ types with different labeling scenarios that you define yourself.
- **Import Formats**: JSON, CSV, TSV, RAR and ZIP archives
- **Mobile-Friendly**: Works on devices of different sizes.
- **Embeddable**: It's an [NPM package](https://github.com/heartexlabs/label-studio-frontend) too. You can include it in your projects.
- **Machine Learning**: Integration support for machine learning. Visualize and compare predictions from different models. Use the best ones for pre-labeling.
- **Stylable**: Configure the visual appearance to match your company brand, distribute the labeling tasks as a part of your product.

## Use Cases

The list of supported use cases for data annotation. Please contribute your own configs and feel free to extend the base types to support more scenarios. Note that it's not an extensive list and has only major scenarios.

| Task | Description |
|-|-|
| **Image** | | 
| Classification |  Put images into categories |
| Object Detection | Detect objects in an image using a bounding box or polygons |
| Semantic Segmentation | Detect for each pixel the object category it belongs to | 
| Pose Estimation | Mark positions of a person’s joints |
| **Text** | | 
| Classification | Put texts into categories |
| Summarization | Create a summary that represents the most relevant information within the original content |
| HTML Tagging | Annotate things like resumes, research, legal papers and excel sheet converted to HTML | 
| **Audio** | |
| Classification | Put audios into categories |
| Speaker Diarisation | partitioning an input audio stream into homogeneous segments according to the speaker identity | 
| Emotion Recognition | Tag and identifying emotion from the audio |
| Transcription | Write down verbal communication in text | 
| **Comparison** | |
| Pairwise | Comparing entities in pairs to judge which of each entity is preferred | 
| Ranking | Sort items in the list according to some property |

## Machine Learning Integration

You can easily connect your favorite machine learning framework with Label Studio by using [Heartex SDK](https://github.com/heartexlabs/pyheartex). 

That gives you the opportunities to use:
- **Pre-labeling**: Use model predictions for pre-labeling
- **Online Learning**: Simultaneously update (retrain) your model while new annotations are coming
- **Active Learning**: Perform labeling in active learning mode
- **Prediction Service**: Instantly create running production-ready prediction service

There is a quick example tutorial on how to do that with simple image classification:

0. Create a new project
   ```bash
   label-studio init --template=image_classification imgcls
   ```
1. Clone pyheartex, and start serving:
    ```bash
    git clone https://github.com/heartexlabs/pyheartex.git
    cd pyheartex/examples/docker
    docker-compose up -d
    ```
2. Specify running server url in `imgcls/config.json`:
    ```json
    "ml_backend": {
      "url": "http://localhost:9090",
      "model_name": "my_image_classifier"
    }
    ```
3. Launch Label Studio server:
    ```bash
    label-studio start imgcls
    ```
    
Once you're satisfied with pre-labeling results, you can immediately send prediction requests via REST API:
```bash
curl -X POST -H 'Content-Type: application/json' -d '{"image_url": "https://go.heartex.net/static/samples/sample.jpg"}' http://localhost:8200/predict
```

Feel free to play around any other models & frameworks apart from image classifiers! (see instructions [here](https://github.com/heartexlabs/pyheartex#advanced-usage))

## Label Studio for Teams, Startups, and Enterprises :office:

Label Studio for Teams is our enterprise edition (cloud & on-prem), that includes a data manager, high-quality baseline models, active learning, collaborators support, and more. Please visit the [website](https://www.heartex.ai/) to learn more.

## Ecosystem

| Project | Description |
|-|-|
| label-studio | Server part, distributed as a pip package |
| [label-studio-frontend](https://github.com/heartexlabs/label-studio-frontend) | Frontend part, written in JavaScript and React, can be embedded into your application | 
| [label-studio-converter](https://github.com/heartexlabs/label-studio-converter) | Encode labels into the format of your favorite machine learning library | 
| [label-studio-transformers](https://github.com/heartexlabs/label-studio-transformers) | Transformers library connected and configured for use with label studio | 

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.ai/). 2020

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />
