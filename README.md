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

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.net/).

<div align="center">
    <a href="https://labelstud.io/"><img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140"></a>
    <h3>Happy Labeling!</h3>
</div>
