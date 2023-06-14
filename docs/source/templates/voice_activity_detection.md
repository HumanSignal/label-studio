---
title: Voice Activity Detection
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 309
meta_title: Voice Activity Detection Data Labeling Template
meta_description: Template for detecting voice activity in an audio clip with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates-misc/voice-activity-detection.png" alt="" class="gif-border" width="600px" height="498px" />

If you want to train a voice activity detection (VAD) model for automating call center interactions, improving voice-activated assistant systems, or other speech detection use cases, you can use this template. Create segments of the audio clip that possibly include speech, then classify each segment as to whether it includes speech, a specific wake word for voice-activated assistant system use cases, or is simply noise.  

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Header value="Listen to the audio:"></Header>
  <Audio name="audio" value="$url" zoom="true"></Audio>    
  <Header value="Highlight segments with sound louder than baseline:"></Header>
  <Labels name="label" toName="audio" choice="multiple">
    <Label value="Above Baseline Sound" background="green" alias="possible-speech"></Label>
  </Labels>
  <Header value="Select a segment and classify it:"></Header>
  <Choices name="voice" toName="audio" choice="multiple" showInline="true" perRegion="true">
    <Choice value="Wake Word" alias="wake-word"></Choice>
    <Choice value="Speech" alias="plain-speech"></Choice>
    <Choice value="Noise" alias="not-speech"></Choice>
  </Choices>
</View>
```

## About the labeling configuration
All labeling configurations must be wrapped in [`View`](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Listen to the audio:"></Header>
```

Use the [Audio](/tags/audio.html) object tag to specify the location of the audio file to process:
```xml
<Audio name="audio" value="$url"></Audio>
```

Use the [Labels](/tags/labels.html) control tag to allow annotators to segment the audio and identify possible spots where speech might be present. 
```xml
  <Labels name="label" toName="audio" choice="multiple">
    <Label value="Above Baseline Sound" background="green" alias="possible-speech"></Label>
  </Labels>
```
The `choice="multiple"` parameter allows one audio segment to be labeled with overlapping labels. The `alias` parameter lets you specify a name for the label in the exported annotations that is different from what appears to annotators.

Use the [Choices](/tags/choices.html) control tag to prompt annotators to classify the type of sound in each audio segment:
```xml
  <Choices name="voice" toName="audio" choice="multiple" showInline="true" perRegion="true">
    <Choice value="Wake Word" alias="wake-word"></Choice>
    <Choice value="Speech" alias="plain-speech"></Choice>
    <Choice value="Noise" alias="not-speech"></Choice>
  </Choices>
```
The `choice="multiple"` parameter allows annotators to select both "Speech" and "Wake Word" as options for a specific segment. The `perRegion` parameter means that each classification applies to a specific audio segment. 

## Related tags
- [Header](/tags/header.html)
- [Audio](/tags/audio.html)
- [Labels](/tags/labels.html)
- [Choices](/tags/choices.html)

## Related templates
- [Signal Quality Detection](signal_quality_detection.html)
- [Sound Event Detection](sound_event_detection.html)
- [Audio Classification with Segments](audio_regions.html)
