---
title: Audio
type: tags
order: 301
meta_title: Audio Tag for Audio Labeling
meta_description: Customize Label Studio with the Audio tag for advanced audio annotation tasks for machine learning and data science projects.
---

The Audio tag plays audio and shows its waveform. Use for audio annotation tasks where you want to label regions of audio, see the waveform, and manipulate audio during annotation.

Use with the following data types: audio

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing path or a URL to the audio |
| [defaultspeed] | <code>string</code> | <code>1</code> | Default speed level (from 0.5 to 2) |
| [defaultscale] | <code>string</code> | <code>1</code> | Audio pane default y-scale for waveform |
| [defaultzoom] | <code>string</code> | <code>1</code> | Default zoom level for waveform (from 1 to 1500) |
| [defaultvolume] | <code>string</code> | <code>1</code> | Default volume level (from 0 to 1) |
| [hotkey] | <code>string</code> |  | Hotkey used to play or pause audio |
| [sync] | <code>string</code> |  | object name to sync with |
| [height] | <code>string</code> | <code>96</code> | Total height of the audio player |
| [waveheight] | <code>string</code> | <code>32</code> | Minimum height of a waveform when in splitchannel mode with multiple channels |
| [splitchannels] | <code>boolean</code> | <code>false</code> | Display multichannel separately (if supported by the file) |
| [decoder] | <code>string</code> | <code>&quot;webaudio&quot;</code> | Decoder type to use to decode audio data. (`"webaudio"` or `"ffmpeg"`) |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| original_length | <code>number</code> | length of the original audio (seconds) |
| value | <code>Object</code> |  |
| value.start | <code>number</code> | start time of the fragment (seconds) |
| value.end | <code>number</code> | end time of the fragment (seconds) |
| value.channel | <code>number</code> | channel identifier which was targeted |

### Example JSON
```json
{
  "original_length": 18,
  "value": {
    "start": 3.1,
    "end": 8.2,
    "channel": 0,
    "labels": ["Voice"]
  }
}
```

### Example

Play audio on the labeling interface

```html
<View>
  <Audio name="audio" value="$audio" />
</View>
```
### Example

Play audio with multichannel support

```html
<View>
  <Audio name="audio" value="$audio" splitchannels="true" />
</View>
```
### Example

Audio classification

```html
<View>
  <Audio name="audio" value="$audio" />
  <Choices name="ch" toName="audio">
    <Choice value="Positive" />
    <Choice value="Negative" />
  </Choices>
</View>
```
### Example

Audio transcription

```html
<View>
  <Audio name="audio" value="$audio" />
  <TextArea name="ta" toName="audio" />
</View>
```
### Example

Labeling configuration to label regions of audio and rate the audio sample

```html
<View>
  <Labels name="lbl-1" toName="audio-1">
    <Label value="Guitar" />
    <Label value="Drums" />
  </Labels>
  <Rating name="rate-1" toName="audio-1" />
  <Audio name="audio-1" value="$audio" />
</View>
```
### Example

Sync with video

```html
<View>
  <Video name="video-1" value="$video" sync="audio-1" />
  <Labels name="lbl-1" toName="audio-1">
    <Label value="Guitar" />
    <Label value="Drums" />
  </Labels>
  <Audio name="audio-1" value="$video" sync="video-1" />
</View>
```
### Example

Sync with paragraphs

```html
<View>
  <Labels name="lbl-1" toName="audio-1">
    <Label value="Guitar" />
    <Label value="Drums" />
  </Labels>
  <Audio name="audio-1" value="$audio" sync="txt-1" />
  <Paragraphs audioUrl="$audio" sync="audio-1" name="txt-1" value="$text" layout="dialogue" showplayer="true" />
</View>
```
