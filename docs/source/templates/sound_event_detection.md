---
title: Sound Event Detection
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 302
meta_title: 
meta_description: 
---

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