---
title: Speaker Segmentation
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 303
meta_title: 
meta_description: 
---

When preparing audio transcripts or training a machine learning model to differentiate between different speakers, use this template to perform speaker segmentation and label different regions of an audio clip with different speakers. 

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

## Related tags

- [Labels](/tags/labels.html)
- [AudioPlus](/tags/audioplus.html)

