<div align="center">
    <a href="https://labelstud.io/" title="Label Studio by Heartex Labs"><img src="https://github.com/heartexlabs/label-studio/blob/master/images/heartex_icon_opossum_green@2x.png?raw=true" title="Label Studio by Heartex Labs" height="140" width="140"></a>
    <br/>
    <h1><a href="https://labelstud.io">Label Studio</a></h1>
    <p>Label Studio is an open-source, configurable data annotation tool.</p>
    <p>Its purpose is to help you label different types of data using a simple interface with a standardized output format. It's mobile-friendly and fast.</p>
</div>

[Website](https://labelstud.io/) • [Docs](https://labelstud.io/docs) • [Twitter](https://twitter.com/heartexlabs) • [Join Slack Community <img src="https://go.heartex.net/docs/images/slack-mini.png" width="18px"/>](https://docs.google.com/forms/d/e/1FAIpQLSdLHZx5EeT1J350JPwnY2xLanfmvplJi6VZk65C2R4XSsRBHg/viewform?usp=sf_link)

![GitHub](https://img.shields.io/github/license/heartexlabs/label-studio?logo=heartex) [![Build Status](https://travis-ci.com/heartexlabs/label-studio.svg?branch=master)](https://travis-ci.com/heartexlabs/label-studio) [![codecov](https://codecov.io/gh/heartexlabs/label-studio/branch/master/graph/badge.svg)](https://codecov.io/gh/heartexlabs/label-studio) ![GitHub release](https://img.shields.io/github/v/release/heartexlabs/label-studio?include_prereleases) [![Gitter](https://badges.gitter.im/label-studio/community.svg)](https://gitter.im/label-studio/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

![Label Studio](https://raw.githubusercontent.com/heartexlabs/label-studio/master/images/label-studio-examples.gif)

## Features ✨

**Simple**: Crafted with minimal UI design. A simple design is the best design.

**Configurable**: Using high-level jsx tags config, you can fully customize the interface for your data.

**Embeddable**: It's an NPM package too. You can include it into your projects.

## Quick Labeling Guides

- [Classify text for sentiment](https://labelstud.io/templates/sentiment_analysis.html)
- [Named entities recognition](https://labelstud.io/templates/named_entity.html)
- [Transcribe audio](https://labelstud.io/templates/transcribe_audio.html)
- [Classify audio](https://labelstud.io/templates/audio_classification.html) 
- [Conversational modeling & chatbots](https://labelstud.io/templates/dialogue_analysis.html)
- [Image object detection](https://labelstud.io/templates/image_bbox.html) 
- [Audio regions](https://labelstud.io/templates/audio_regions.html)
- [Image KeyPoints](https://labelstud.io/templates/image_keypoints.html)<sup>New</sup>
- [Image Polygons](https://labelstud.io/templates/image_polygons.html)<sup>New</sup>

Coming Soon:

- Time series
- Video

## Usage

### Frontend package

```sh
npm install label-studio
```

Check [documentation](https://labelstud.io/guide/frontend.html) about frontend integration.

### Backend and frontend

Check [documentation](https://labelstud.io/guide/backend.html) about backend + frontend integration.

### Docker
```sh
docker run -p 8200:8200 -t -i heartexlabs/label-studio -c config.json -l ../examples/chatbot_analysis/config.xml -i ../examples/chatbot_analysis/tasks.json -o output
```

### Machine learning integration

You can easily connect your favorite machine learning framework with Label Studio by using [Heartex SDK](https://github.com/heartexlabs/pyheartex). 

That gives you the opportunities to:
- use model predictions as prelabeling
- simultaneously update (retrain) your model while new annotations are coming
- perform labeling in active learning mode
- instantly create running production-ready prediction service

There is a quick example tutorial how to do that with simple image classification:

1. Clone pyheartex, and start serving:
    ```bash
    git clone https://github.com/heartexlabs/pyheartex.git
    cd pyheartex/examples/docker
    docker-compose up -d
    ```
2. Specify running server in your label config:
    ```json
    "ml_backend": {
      "url": "http://localhost:9090",
      "model_name": "my_super_model"
    }
    ```
3. Launch Label Studio with [image classification config](examples/image_classification/config.xml):
    ```bash
    python server.py -l ../examples/image_classification/config.xml
    ```
    
Once you're satisfied with prelabeling results, you can imediately send prediction requests via REST API:
```bash
curl -X POST -H 'Content-Type: application/json' -d '{"image_url": "https://go.heartex.net/static/samples/kittens.jpg"}' http://localhost:8200/predict
```

Feel free to play around any other models & frameworks apart from image classifiers! (see instructions [here](https://github.com/heartexlabs/pyheartex#advanced-usage))

## Changelog

Detailed changes for each release are documented in the [release notes](https://github.com/heartexlabs/label-studio/releases).

## Stay In Touch

- [Slack](https://docs.google.com/forms/d/e/1FAIpQLSdLHZx5EeT1J350JPwnY2xLanfmvplJi6VZk65C2R4XSsRBHg/viewform?usp=sf_link)
- [Twitter](https://twitter.com/heartexlabs)
- [Email](mailto:hi@heartex.net)

## Contributing

Please make sure to read the

- [Contributing Guideline](/CONTRIBUTING.md)
- [Code Of Conduct](/CODE_OF_CONDUCT.md)

## Label Studio for Teams, Startups, and Enterprises

Label Studio for Teams is our enterprise edition (cloud & on-prem), that includes a data manager, high-quality baseline models, active learning, collaborators support, and more. Please visit the [website](https://www.heartex.ai/) to learn more.

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.net/).

<div align="center">
    <a href="https://labelstud.io/"><img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140"></a>
    <h3>Happy Labeling!</h3>
</div>
