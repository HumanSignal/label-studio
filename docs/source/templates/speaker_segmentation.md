---
title: Speaker Diarization
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 304
meta_title: Speaker Diarization (Segmentation) Data Labeling Template
meta_description: Template for segmenting an audio clip based on speaker with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/speaker-segmentation.png" alt="" class="gif-border" width="552px" height="408px" />

When preparing audio transcripts or training a machine learning model to differentiate between different speakers, use this template to perform speaker segmentation and label different regions of an audio clip with different speakers. 

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Labels name="label" toName="audio" zoom="true" hotkey="ctrl+enter">
    <Label value="Speaker one" background="#00FF00"/>
    <Label value="Speaker two" background="#12ad59"/>
  </Labels>
  <Audio name="audio" value="$audio" />
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Labels](/tags/labels.html) control tag to allow annotators to highlight specific regions of the audio clip and apply a label:
```xml
<Labels name="label" toName="audio" zoom="true" hotkey="ctrl+enter">
    <Label value="Speaker one" background="#00FF00"/>
    <Label value="Speaker two" background="#12ad59"/>
</Labels>
```

Use the [Audio](/tags/audio.html) object tag to display a waveform of audio and allow annotators to change the speed of the audio playback:
```xml
<Audio name="audio" value="$audio" />
```

## Related tags

- [Labels](/tags/labels.html)
- [Audio](/tags/audio.html)

