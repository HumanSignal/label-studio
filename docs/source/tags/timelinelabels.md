---
title: TimelineLabels
type: tags
order: 429
is_new: t
meta_title: TimelineLabels tag
meta_description: Classify video frames using TimelineLabels.
---

Use the TimelineLabels tag to classify video frames. This can be a single frame or a span of frames.

First, select a label and then click once to annotate a single frame. Click and drag to annotate multiple frames. 

To move forward and backward in the timeline without labeling, ensure that no labels are selected before you click. 

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
| value.ranges | <code>Array.&lt;object&gt;</code> | array of ranges, each range is an object with `start` and `end` properties; one range per region for now |
| [value.timelinelabels] | <code>Array.&lt;string&gt;</code> | regions are created only by `TimelineLabels`, and this label is listed here |

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
