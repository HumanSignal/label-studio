---
title: Audio Classification
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 307
meta_title: Audio Classification Data Labeling Template
meta_description: Template for classifying audio and intent using Label Studio for your data science and machine learning projects.
---

Listen to the audio file and classify it. 

<img src="/images/screens/audio_classification.png" class="img-template-example" title="Audio Classification" />


## Labeling Configuration

```html
<View>
  <Header value="Listen to the audio:"></Header>
  <Audio name="audio" value="$url"></Audio>
  <Header value="Select its topic:"></Header>
  <Choices name="label" toName="audio" choice="single-radio" showInline="true">
    <Choice value="Politics"></Choice>
    <Choice value="Business"></Choice>
    <Choice value="Education"></Choice>
    <Choice value="Other"></Choice>
  </Choices>
</View>
```

## Related tags

- [Audio](/tags/audio.html)
- [Choices](/tags/choices.html)