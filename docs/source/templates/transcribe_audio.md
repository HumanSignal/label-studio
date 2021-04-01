---
title: Audio Transcription 
type: templates
order: 303
meta_title: Audio Transcription Data Labeling Template
meta_description: Label Studio Audio Transcription Template for machine learning and data science data labeling projects.

---

Listen to an audio file and transcribe its content in natural language

<img src="/images/screens/audio_transcription.png" class="img-template-example" title="Transcribe an Audio" />

## Run

```bash
label-studio init --template=transcribe_audio transcribe_audio_project
label-studio start transcribe_audio_project 
```

## Config 

```html
<View>
  <Header value="Listen to the audio:"></Header>
  <Audio name="audio" value="$url"></Audio>
  <Header value="Write the transcription:"></Header>
  <TextArea name="answer"></TextArea>
</View>
```
