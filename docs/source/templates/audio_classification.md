---
title: Audio Classification
type: templates
order: 202
---

Listen to the audio file and classify

<img src="/images/screens/audio_classification.png" class="img-template-example" title="Audio Classification" />

## Run

```bash
python server.py -c config.json -l ../examples/audio_classification/config.xml -i ../examples/audio_classification/tasks.json -o output_audio_classes
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
