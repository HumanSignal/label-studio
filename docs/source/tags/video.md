---
title: Video
type: tags
order: 310
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
| [frameRate] | <code>number</code> | <code>24</code> | video frame rate per second; default is 24; can use task data like `$fps` |
| [sync] | <code>string</code> |  | object name to sync with |
| [muted] | <code>boolean</code> | <code>false</code> | muted video |
| [height] | <code>number</code> | <code>600</code> | height of the video player |
| [timelineHeight] | <code>number</code> | <code>64</code> | height of the timeline with regions |

### Example

Labeling configuration to display a video on the labeling interface

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
