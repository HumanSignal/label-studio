---
title: Intent Classification
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 305
meta_title: Intent Classification Data Labeling Template
meta_description: Template for classifying intent of audio data with Label Studio for your machine learning and data science projects.
---

If you want to identify the intent of an audio recording, such as an interview or customer service call, use this template to classify intent by selecting choices and listening to an audio clip.

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

## Related tags

- [Labels](/tags/labels.html)
- [AudioPlus](/tags/audioplus.html)
- [Choices](/tags/choices.html)