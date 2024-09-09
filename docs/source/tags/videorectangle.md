---
title: VideoRectangle
type: tags
order: 430
meta_title: Video Tag for Video Labeling
meta_description: Customize Label Studio with the Video tag for basic video annotation tasks for machine learning and data science projects.
---

VideoRectangle tag brings Object Tracking capabilities to videos. It works in combination with the `<Video/>` and the `<Labels/>` tags.

Use with the following data types: video

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the element |
| toName | <code>string</code> | Name of the element to control (video) |

### Example

Video Object Tracking

```html
<View>
  <Header>Label the video:</Header>
  <Video name="video" value="$video" />
  <VideoRectangle name="box" toName="video" />

  <Labels name="videoLabels" toName="video">
    <Label value="Cell" background="#944BFF"/>
    <Label value="Bacteria" background="#98C84E"/>
  </Labels>
</View>
```
