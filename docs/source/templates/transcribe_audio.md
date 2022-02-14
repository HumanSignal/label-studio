---
title: Automatic Speech Recognition
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 301
meta_title: Audio Transcription Data Labeling Template
meta_description: Template for audio transcription for automatic speech recognition use cases with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/automatic-speech-recognition.png" alt="" class="gif-border" width="552px" height="408px" />

Listen to an audio file and transcribe its content in natural language, performing speech recognition.

## Interactive Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Audio name="audio" value="$audio" zoom="true" hotkey="ctrl+enter" />
  <Header value="Provide Transcription" />
  <TextArea name="transcription" toName="audio" rows="4" editable="true" maxSubmissions="1" />
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [`View`](/tags/view.html) tags.

```html
<View>
    <!--Use the Audio object tag to allow annotators to play back audio
    on the labeling interface using a specific hotkey-->
  <Audio name="audio" value="$audio" zoom="true" hotkey="ctrl+enter" />
    <!--Use the Header tag to provide instructions to annotators-->
  <Header value="Provide Transcription" />
    <!--Use the TextArea control tag to prompt annotators to add a transcript for the audio-->
  <TextArea name="transcription" toName="audio" rows="4" editable="true" maxSubmissions="1" />
</View>
```

## Enhance this template

## Related tags

- [Audio](/tags/audio.html)
- [Labels](/tags/labels.html)
- [TextArea](/tags/textarea.html)