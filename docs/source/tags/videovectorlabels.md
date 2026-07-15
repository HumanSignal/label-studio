---
title: VideoVectorLabels
short: VideoVectorLabels
type: tags
order: 438
meta_title: VideoVectorLabels Tag for Video Vector Annotation
meta_description: Customize Label Studio with the VideoVectorLabels tag for labeled vector annotation on video.
---

The `VideoVectorLabels` tag creates labeled vectors on video frames. It combines [VideoVector](/tags/videovector.html) and [Labels](/tags/labels.html) into one tag for convenient vector annotation, with keyframe-based interpolation across video frames.

Use with the following data types: video.

## Parameters

{% insertmd includes/tags/videovectorlabels.md %}

### Example

Labeled vector annotation on video with closable paths

```html
<View>
  <Video name="video" value="$video" />
  <VideoVectorLabels name="labels" toName="video" closable="true">
    <Label value="Road" />
    <Label value="Boundary" />
  </VideoVectorLabels>
</View>
```

### Result parameters

**Kind**: global typedef
**Returns**: <code>VideoVectorRegionResult</code> - The serialized video vector region data in Label Studio format
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| original_width | <code>number</code> | width of the original video frame (px) |
| original_height | <code>number</code> | height of the original video frame (px) |
| image_rotation | <code>number</code> | rotation degree of the video frame (deg) |
| value | <code>Object</code> |  |
| value.sequence | <code>Array.&lt;Object&gt;</code> | array of keyframes; positions between keyframes are interpolated |
| value.sequence[].frame | <code>number</code> | frame number the keyframe applies to |
| value.sequence[].enabled | <code>boolean</code> | whether the vector is visible starting at this keyframe |
| value.sequence[].closed | <code>boolean</code> | whether the vector is closed (polygon) or open (polyline) on this keyframe |
| value.sequence[].vertices | <code>Array.&lt;Object&gt;</code> | array of point objects with coordinates, bezier curve information, and point relationships |
| value.labels | <code>Array.&lt;string&gt;</code> | array of label names assigned to this vector |

#### Example results JSON export

```json
{
  "original_width": 1920,
  "original_height": 1280,
  "image_rotation": 0,
  "value": {
    "sequence": [
      {
        "frame": 1,
        "enabled": true,
        "closed": true,
        "vertices": [
          { "id": "point-1", "x": 25.0, "y": 30.0, "prevPointId": null, "isBezier": false },
          { "id": "point-2", "x": 75.0, "y": 30.0, "prevPointId": "point-1", "isBezier": false },
          { "id": "point-3", "x": 50.0, "y": 70.0, "prevPointId": "point-2", "isBezier": false }
        ]
      }
    ],
    "labels": ["Road"]
  }
}
```
