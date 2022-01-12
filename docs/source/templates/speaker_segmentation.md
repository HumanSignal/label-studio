---
title: Speaker Segmentation
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 303
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
  <Labels name="label" toName="audio" zoom="true" hotkey="ctrl+enter">
    <Label value="Speaker one" background="#00FF00"/>
    <Label value="Speaker two" background="#12ad59"/>
  </Labels>
  <AudioPlus name="audio" value="$audio" />
</View>
```