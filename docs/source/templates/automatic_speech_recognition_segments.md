---
title: Automatic Speech Recognition using Segments
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 303
meta_title: Automatic Speech Recognition using Segments Data Labeling Template
meta_description: Template for audio transcription for automatic speech recognition segmentation use cases with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/automatic-speech-recognition-using-segments.png" alt="" class="gif-border" width="552px" height="408px" />

Listen to an audio file and segment it, then transcribe the contents of each segment in natural language, performing speech recognition using segments.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Labels name="labels" toName="audio">
    <Label value="Speech" />
    <Label value="Noise" />
  </Labels>
  <Audio name="audio" value="$audio"/>
  <TextArea name="transcription" toName="audio"
            rows="2" editable="true"
            perRegion="true" required="true" />
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Labels](/tags/labels.html) control tag to allow annotators to highlight portions of the audio that represent different types of noise:
```xml
<Labels name="labels" toName="audio">
    <Label value="Speech" />
    <Label value="Noise" />
</Labels>
```

Use the [Audio](/tags/audio.html) object tag to display a waveform of audio that can be labeled:
```xml
<Audio name="audio" value="$audio"/>
```

Use the [TextArea](/tags/textarea.html) control tag to prompt annotators to provide a transcript for each segment of audio:
```xml
  <TextArea name="transcription" toName="audio"
            rows="2" editable="true"
            perRegion="true" required="true" />
```
The `editable="true"` argument specifies that the transcript can be edited, and `required="true"` sets the transcript as a required field for the annotator. Without a transcript provided for each segment of the audio clip (set by the `perRegion="true"` argument), the annotation can't be submitted.

## Enhance this template

### Add context to specific audio segments

If you want to prompt annotators to add context to specific audio segments, such as by selecting the accent or assumed gender of the speakers in a given audio clip, you can add the following to your labeling configuration:
```xml
    <View visibleWhen="region-selected">
      <Header value="Select the assumed gender of the speaker:" />
      <Choices name="gender" toName="audio"
               perRegion="true" required="true">
        <Choice value="Man" />
        <Choice value="Woman" />
      </Choices>
    </View>
```
The `visibleWhen` parameter for the [View](/tags/view.html) tag means that the choice is only visible when a specific audio segment is selected. The [Header](/tags/header.html) tag provides instructions to the annotator. The [Choices](/tags/choices.html) tag includes the `perRegion` parameter to apply the selected choice only to the selected audio segment. 


## Related tags

- [Audio](/tags/audio.html)
- [Labels](/tags/labels.html)
- [TextArea](/tags/textarea.html)
