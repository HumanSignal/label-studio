---
title: Audio
type: tags
order: 302
meta_title: Audio Tag for Labeling Audio
meta_description: Customize Label Studio to label audio data for machine learning and data science projects.
---

The Audio tag plays a simple audio file. Use this tag for basic audio annotation tasks such as classification or transcription.

Use with the following data types: audio

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing path or a URL to the audio |
| hotkey | <code>string</code> |  | Hotkey used to play or pause audio |
| [cursorwidth] | <code>string</code> | <code>1</code> | Audio pane cursor width. It is measured in pixels. |
| [cursorcolor] | <code>string</code> | <code>&quot;#333&quot;</code> | Audio pane cursor color. The color should be specified in hex decimal string |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| original_length | <code>number</code> | length of the original audio (seconds) |
| value | <code>Object</code> |  |
| value.start | <code>number</code> | start time of the fragment (seconds) |
| value.end | <code>number</code> | end time of the fragment (seconds) |

### Example JSON
```json
{
  "original_length": 18,
  "value": {
    "start": 3.1,
    "end": 8.2,
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
