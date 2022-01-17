---
title: AudioPlus
type: tags
order: 302
meta_title: AudioPlus Tag for Audio Labeling
meta_description: Customize Label Studio with the AudioPlus tag for advanced audio annotation tasks for machine learning and data science projects.
---

The AudioPlus tag plays audio and shows its waveform. Use for audio annotation tasks where you want to label regions of audio, see the waveform, and manipulate audio during annotation.

Use with the following data types: audio

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing path or a URL to the audio |
| [volume] | <code>boolean</code> | <code>false</code> | Whether to show a volume slider (from 0 to 1) |
| [speed] | <code>boolean</code> | <code>false</code> | Whether to show a speed slider (from 0.5 to 3) |
| [zoom] | <code>boolean</code> | <code>true</code> | Whether to show the zoom slider |
| [hotkey] | <code>string</code> |  | Hotkey used to play or pause audio |
| [sync] | <code>string</code> |  | object name to sync with |

### Example
```html
<!--Labeling configuration to label regions of audio and rate the audio sample-->
<View>
  <Labels name="lbl-1" toName="audio-1">
    <Label value="Guitar" />
    <Label value="Drums" />
  </Labels>
  <Rating name="rate-1" toName="audio-1" />
  <AudioPlus name="audio-1" value="$audio" />
</View>
```
