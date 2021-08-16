---
title: Audio
type: tags
order: 301
meta_title: Audio Tags for Labeling Audio
meta_description: Label Studio Audio Tags customize Label Studio for labeling audio for machine learning and data science projects.
---

Audio tag plays a simple audio file

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the element |
| value | <code>string</code> | Value of the element |
| hotkey | <code>string</code> | Hotkey used to play or pause audio |

### Example
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
