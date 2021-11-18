---
title: Video
type: tags
order: 309
meta_title: Video Tag for Video Labeling
meta_description: Customize Label Studio with the Video tag for basic video annotation tasks for machine learning and data science projects.
---

Video tag plays a simple video file. Use for video annotation tasks such as classification and transcription.

Use with the following data types: video

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | URL of the video |
| [frameRate] | <code>number</code> | <code>0.04</code> | frame rate in seconds; default 1/25s |

### Example
```html
<!--Labeling configuration to display a video on the labeling interface-->
<View>
  <Video name="video" value="$video" />
</View>

<!-- {"video": "https://app.heartex.com/static/samples/opossum_snow.mp4" } -->
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

<!-- {"video": "https://app.heartex.com/static/samples/opossum_snow.mp4" } -->
```
### Example

Video transcription

```html
<View>
  <Video name="video" value="$video" />
  <TextArea name="ta" toName="video" />
</View>

<!-- {"video": "https://app.heartex.com/static/samples/opossum_snow.mp4" } -->
```
