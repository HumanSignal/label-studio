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

Use the [Audio](/tags/audio.html) object tag with the `hotkey` argument to allow annotators to play back audio on the labeling interface using a specific hotkey, and use the `zoom="true"` argument to allow annotators to zoom in on the audio wave:
```xml
<Audio name="audio" value="$audio" zoom="true" hotkey="ctrl+enter" />
```

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Provide Transcription" />
```

Use the [TextArea](/tags/textarea.html) control tag to prompt annotators to add a transcript for the audio:
```xml
<TextArea name="transcription" toName="audio" rows="4" editable="true" maxSubmissions="1" />
```
The `rows="4"` argument lets you configure the size of the text box visible on the labeling interface. The `maxSubmissions="1"` argument limits the maximum number of transcripts submitted by an annotator for the audio clip to one, while the `editable="true"` argument allows annotators to edit the transcript. 


## Related tags

- [Audio](/tags/audio.html)
- [Labels](/tags/labels.html)
- [TextArea](/tags/textarea.html)
