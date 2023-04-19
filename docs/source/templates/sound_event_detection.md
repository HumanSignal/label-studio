---
title: Sound Event Detection
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 302
meta_title: Sound Event Detection Data Labeling Template
meta_description: Template for detecting sound from events in audio clips with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/sound-event-detection.png" alt="" class="gif-border" width="552px" height="408px" />

For cases when you need to improve sound event detection, use this template to play an audio clip and label specific audio regions according to which event sound is audible from. 

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Labels name="label" toName="audio" zoom="true" hotkey="ctrl+enter">
    <Label value="Event A" background="red"/>
    <Label value="Event B" background="green"/>
  </Labels>
  <Audio name="audio" value="$audio"/>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Labels](/tags/labels.html) control tag to highlight spans of audio with the relevant event label:
```xml
  <Labels name="label" toName="audio" zoom="true" hotkey="ctrl+enter">
    <Label value="Event A" background="red"/>
    <Label value="Event B" background="green"/>
  </Labels>
```

Use the Audio object tag to display audio with a waveform, segment the audio clip, and provide annotators the option to change the speed of the audio playback.
```xml
<Audio name="audio" value="$audio" />
```

## Related tags

- [Labels](/tags/labels.html)
- [Audio](/tags/audio.html)
