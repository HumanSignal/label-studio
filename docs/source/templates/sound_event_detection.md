---
title: Sound Event Detection
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 302
meta_title: Sound Event Detection Data Labeling Template
meta_description: Template for detecting sound from events in audio clips with Label Studio for your machine learning and data science projects.
---

Label which event audio is associated with in an audio clip. 

## Labeling Configuration

```html
<View>
  <Labels name="label" toName="audio" zoom="true" hotkey="ctrl+enter">
    <Label value="Event A" background="red"/>
    <Label value="Event B" background="green"/>
  </Labels>
  <AudioPlus name="audio" value="$audio"/>
</View>
```

## Related tags

- [Labels](/tags/labels.html)
- [AudioPlus](/tags/audioplus.html)