---
title: Transcribe an audio
type: templates
order: 208
---

Listen to an audio file and transcribe its content in natural language

![Transcribe an Audio](https://user.fm/files/v2-e1f1d31d32db73c07d20a96a78758623/Screen%20Shot%202019-08-01%20at%209.39.54%20PM.png "Transcribe an Audio")

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
