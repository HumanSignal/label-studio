---
title: Audio Classification with Segments
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 308
meta_title: Audio Classification with Segments Data Labeling Template
meta_description: Template for classifying audio regions for segmentation tasks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates-misc/audio-classification-segments.png" alt="" class="gif-border" width="598.4px" height="319.2px" />

If you want to perform audio classification tasks on specific segments of audio clips, you can use this template to listen to an audio file and classify the topic of the clip.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration 

```html
<View>
  <Header value="Select its topic:"></Header>
  <Labels name="label" toName="audio" choice="multiple">
    <Label value="Politics" background="yellow"></Label>
    <Label value="Business" background="red"></Label>
    <Label value="Education" background="blue"></Label>
    <Label value="Other"></Label>
  </Labels>
  <Header value="Listen to the audio:"></Header>
  <Audio name="audio" value="$url"></Audio>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Select its topic:"></Header>
```

Use the [Labels](/tags/labels.html) control tag to allow annotators to segment the audio and classify it at the same time. 
```xml
<Labels name="label" toName="audio" choice="multiple">
    <Label value="Politics" background="yellow"></Label>
    <Label value="Business" background="red"></Label>
    <Label value="Education" background="blue"></Label>
    <Label value="Other"></Label>
</Labels>
```
The `choice="multiple"` argument allows one audio segment to be labeled with multiple topics.

Use the [Audio](/tags/audio.html) object tag to specify the location of the audio file to classify:
```xml
<Audio name="audio" value="$url"></Audio>
```

## Related tags

- [Audio](/tags/audio.html)
- [Labels](/tags/labels.html)
