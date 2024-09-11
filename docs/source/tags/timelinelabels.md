---
title: TimelineLabels
type: tags
order: 429
meta_title: TimelineLabels tag
meta_description: Classify video frames using TimelineLabels.
---

Use the TimelineLabels tag to classify video frames. This can be a single frame or a span of frames.

First, select a label and then click once to annotate a single frame. Click and drag to annotate multiple frames.

![Screenshot of video with frame classification](../images/timelinelabels.png)

Use with the `<Video>` control tag.

!!! info Tip
    You can increase the height of the timeline using the `timelineHeight` parameter on the `<Video>` tag.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the element |
| toName | <code>string</code> | Name of the video element |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| value | <code>Object</code> |  |
| value.ranges | <code>Array.&lt;object&gt;</code> | Array of ranges, each range is an object with `start` and `end` properties. One range per region. |
| [value.timelinelabels] | <code>Array.&lt;string&gt;</code> | Regions are created by `TimelineLabels`, and the corresponding label is listed here. |

### Example JSON
```json
{
  "value": {
    "ranges": [{"start": 3, "end": 5}],
    "timelinelabels": ["Moving"]
  }
}
```

### Example
```html
<View>
  <Header>Label timeline spans:</Header>
  <Video name="video" value="$video" />
  <TimelineLabels name="timelineLabels" toName="video">
    <Label value="Nothing" background="#944BFF"/>
    <Label value="Movement" background="#98C84E"/>
  </TimelineLabels>
</View>
```
