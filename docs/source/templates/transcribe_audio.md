---
title: Transcribe an audio
type: templates
order: 208
---

Listen to an audio file and transcribe its content in natural language

<img src="/images/screens/audio_transcription.png" class="img-template-example" title="Transcribe an Audio" />

## Run

```bash
python server.py -c config.json -l ../examples/transcribe_audio/config.xml -i ../examples/transcribe_audio/tasks.json -o output
```

## Config 

```html
<View>
  <Header value="Listen the audio:"></Header>
  <Audio name="audio" value="$url"></Audio>
  <Header value="Write the transcription:"></Header>
  <TextArea name="answer"></TextArea>
</View>
```
