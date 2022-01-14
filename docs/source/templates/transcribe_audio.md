---
title: Automatic Speech Recognition
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 301
meta_title: Audio Transcription Data Labeling Template
meta_description: Label Studio Audio Transcription Template for machine learning and data science data labeling projects.

---

Listen to an audio file and transcribe its content in natural language, performing speech recognition.

<img src="/images/screens/audio_transcription.png" class="img-template-example" title="Transcribe an Audio" />

## Labeling Configuration

```html
<View>
  <Audio name="audio" value="$audio" zoom="true" hotkey="ctrl+enter" />
  <Header value="Provide Transcription" />
  <TextArea name="transcription" toName="audio" rows="4" editable="true" maxSubmissions="1" />
</View>
```

## Labeling Configuration with Segments

```html
<View>
  <Labels name="labels" toName="audio">
    <Label value="Speech" />
    <Label value="Noise" />
  </Labels>

  <AudioPlus name="audio" value="$audio"/>

  <TextArea name="transcription" toName="audio"
            rows="2" editable="true"
            perRegion="true" required="true" />
</View>
```

## Related tags

- [AudioPlus](/tags/audioplus.html)
- [Audio](/tags/audio.html)
- [Labels](/tags/labels.html)
- [TextArea](/tags/textarea.html)