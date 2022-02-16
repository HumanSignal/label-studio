---
title: Audio Classification for Segments
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 308
meta_title: Audio Classification for Segments Data Labeling Template
meta_description: Template for classifying audio regions for segmentation tasks with Label Studio for your machine learning and data science projects.
---

If you want to perform audio classification tasks on specific segments of audio clips, you can use this template to listen to an audio file and classify the topic of the clip.

## Template Preview

Interactively preview this labeling template:

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
  <AudioPlus name="audio" value="$url"></AudioPlus>
</View>
```

## Related tags

- [AudioPlus](/tags/audioplus.html)
- [Choices](/tags/choices.html)