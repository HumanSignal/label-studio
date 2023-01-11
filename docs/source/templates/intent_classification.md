---
title: Intent Classification
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 305
meta_title: Intent Classification Data Labeling Template
meta_description: Template for classifying intent of audio data with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/intent-classification.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to identify the intent of an audio recording, such as an interview or customer service call, use this template to classify intent by selecting choices and listening to an audio clip.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Labels name="labels" toName="audio">
    <Label value="Segment" />
  </Labels>
  <AudioPlus name="audio" value="$audio"/>
  <Choices name="intent" toName="audio" perRegion="true" required="true">
    <Choice value="Question" />
    <Choice value="Request" />
    <Choice value="Satisfied" />
    <Choice value="Interested" />
    <Choice value="Unsatisfied" />
  </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Labels](/tags/labels.html) control tag to label specific segments of the audio clip:
 
```xml
<Labels name="labels" toName="audio">
    <Label value="Segment" />
</Labels>
```

Use the [AudioPlus](/tags/audioplus.html) object tag to specify the audio data and display an audio wave that can be segmented:
```xml
<AudioPlus name="audio" value="$audio"/>
```

Use the [Choices](/tags/choices.html) control tag to classify the intent for each segmented region of the audio clip:
```xml
  <Choices name="intent" toName="audio" perRegion="true" required="true">
    <Choice value="Question" />
    <Choice value="Request" />
    <Choice value="Satisfied" />
    <Choice value="Interested" />
    <Choice value="Unsatisfied" />
  </Choices>
```
Because of the `perRegion="true"` argument, each choice applies to a different segment labeled as a segment. The `required="true"` argument ensures that each labeled audio segment has a choice selected before the annotation can be submitted.

## Related tags

- [Labels](/tags/labels.html)
- [AudioPlus](/tags/audioplus.html)
- [Choices](/tags/choices.html)
