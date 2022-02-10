---
title: Audio Classification
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 307
meta_title: Audio Classification Data Labeling Template
meta_description: Template for classifying audio and intent using Label Studio for your data science and machine learning projects.
---

<img src="/images/templates/intent-classification.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to perform audio classification tasks, such as intent or sentiment classification, you can use this template to listen to an audio file and classify the topic of the clip.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--use a header to advise the annotator what to do-->
  <Header value="Listen to the audio:"></Header>
    <!--object tag is used to specify the type and location of the audio clip-->
  <Audio name="audio" value="$url"></Audio>
  <Header value="Select its topic:"></Header>
    <!--control tag of Choices specifies the available choices to classify the audio. 
    You can modify the values, or change the required number of choices that an annotator 
    must select by modifying the arguments of the tag. -->
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