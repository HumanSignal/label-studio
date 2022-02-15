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

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!-- Use the Labels control tag to identify segments of the audio clip-->
  <Labels name="labels" toName="audio">
    <Label value="Segment" />
  </Labels>
<!--Use the AudioPlus object tag to specify the audio data and display 
an audio wave that can be segmented-->
  <AudioPlus name="audio" value="$audio"/>
<!--Use the Choices control tag to classify the intent for each segmented 
region of the audio clip. Each choice applies to a different segment labeled
with the Labels option--> 
  <Choices name="intent" toName="audio" perRegion="true" required="true">
    <Choice value="Question" />
    <Choice value="Request" />
    <Choice value="Satisfied" />
    <Choice value="Interested" />
    <Choice value="Unsatisfied" />
  </Choices>
</View>
```

## Related tags

- [Labels](/tags/labels.html)
- [AudioPlus](/tags/audioplus.html)
- [Choices](/tags/choices.html)