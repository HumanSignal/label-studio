---
title: Video
type: tags
order: 309
is_new: t
---

Video tag plays a simple video file.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | URL of the video |
| [frameRate] | <code>number</code> | <code>0.04</code> | frame rate in seconds; default 1/25s |

### Example
```html
<View>
  <Video name="video" value="$video" />
</View>
```
### Example

Video classification

```html
<View>
  <Video name="video" value="$video" />
  <Choices name="ch" toName="video">
    <Choice value="Positive" />
    <Choice value="Negative" />
  </Choices>
</View>
```
### Example

Video transcription

```html
<View>
  <Video name="video" value="$video" />
  <TextArea name="ta" toName="video" />
</View>
```
