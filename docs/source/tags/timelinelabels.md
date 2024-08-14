---
title: TimelineLabels
type: tags
order: 429
is_new: t
meta_title: Video Tag for Video Labeling
meta_description: Customize Label Studio with the Video tag for basic video annotation tasks for machine learning and data science projects.
---

### Parameters
**Todo**

- [ ] rewrite this
TimelineLabels tag brings Object Tracking capabilities to videos. It works in combination with the `<Video/>` and the `<Labels/>` tags.

Use with the following data types: video


| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the element |
| toName | <code>string</code> | Name of the element to control (video) |

### Example
```html
<View>
  <Header>Label states on the video:</Header>
  <Video name="video" value="$video" />
  <TimelineLabels name="timelineLabels" toName="video">
    <Label value="Nothing" background="#944BFF"/>
    <Label value="Movement" background="#98C84E"/>
  </Labels>
</View>
```
