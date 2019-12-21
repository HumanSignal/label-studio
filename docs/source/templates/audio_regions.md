---
title: Audio Regions
type: templates
order: 203
---

Listen to the audio file and classify

<img src="/images/screens/audio_regions.png" class="img-template-example" title="Audio Regions" />

<p class="tip">For audio regions to work when you have remote URLs, you need to configure CORS to be wide-open</p>

## Run

```bash
python server.py -c config.json -l ../examples/audio_regions/config.xml -i ../examples/audio_regions/tasks.json -o output_audio_regions
```

## Config 

```html
<View>
  <Header value="Select its topic:"></Header>
  <Labels name="label" toName="audio" choice="multiple">
    <Label value="Politics" background="yellow"></Label>
    <Label value="Business" background="red"></Label>
    <Label value="Education" background="blue"></Label>
    <Label value="Other"></Label>
  </Labels>
  <Header value="Listen the audio:"></Header>
  <AudioPlus name="audio" value="$url"></AudioPlus>
</View>
```
