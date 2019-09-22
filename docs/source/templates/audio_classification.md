---
title: Audio Classification
type: templates
order: 201
---

Listen to the audio file and classify

![Audio Classification](https://user.fm/files/v2-70ded6823222ef7f5291482df9ce39c2/Screen%20Shot%202019-08-01%20at%209.21.12%20PM.png "Audio Classification")

## Run

```bash
python server.py -c config.json -l ../examples/audio_classification/config.xml -i ../examples/audio_classification/tasks.json -o output
```

## Config 

```html
<View>
  <Header value="Listen the audio:"></Header>
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
