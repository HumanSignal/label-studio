---
title: VideoVector
short: VideoVector
type: tags
order: 437
meta_title: VideoVector Tag for Video Vector Annotation
meta_description: Customize Label Studio with the VideoVector tag for vector annotation on video frames.
---

The `VideoVector` tag brings vector annotation capabilities to videos. It works in combination with the `<Video/>` and the `<Labels/>` tags, and supports closable paths and skeleton mode with keyframe-based interpolation across video frames.

Use with the following data types: video.

<iframe class="video-border" width="100%" height="400vh" src="https://www.youtube.com/embed/NR0CkXODEbk" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## How keyframes work

You annotate a vector on a single frame and Label Studio stores that frame as a keyframe. When you move points, add points, or close the path on a later frame, a new keyframe is created. Label Studio linearly interpolates each vertex position (including bezier control points) between keyframes, so the vector follows your object as the video plays.

## Path and point basics

| Action                      | Instruction |
|------------------------------|-------------|
| **Add points**               | Click on empty space. |
| **Add points to path segments** | Press <code>Shift</code> while clicking on a segment that is between two points. |
| **End or exit the path**     | Press <code>Esc</code> or double-click on the last point you added to the path. |
| **Move points**              | Simply click a point and drag to reposition. |
| **Delete points**            | Press <code>Alt</code> or <code>Option</code> and click on an existing point. |

## Advanced

### Closed paths

You can create closed paths to create polygon shapes. To create closed paths, use the `closable="true"` parameter in your labeling configuration.

| Action                 | Instruction                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| **Close the path**   | Double-click on your final point. This automatically adds a segment between your first point and final point.      |
| **Break closed path**   | Press `Alt` or `Option` and click on a vector segment in a closed path to reopen it. Click on a point to delete the point.      |

### Skeleton

You can create skeleton vectors using the `skeleton="true"` parameter in your labeling configuration.

When enabled, new points connect to the active point and not the last added point.

## Parameters

{% insertmd includes/tags/videovector.md %}

### Example

Video Vector Annotation

```html
<View>
  <Header>Label the video:</Header>
  <Video name="video" value="$video" />
  <VideoVector name="vector" toName="video" />

  <Labels name="videoLabels" toName="video">
    <Label value="Road" background="#944BFF"/>
    <Label value="Boundary" background="#98C84E"/>
  </Labels>
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
| value.labels | <code>Array.&lt;string&gt;</code> | array of label names assigned to this vector (when used with `<Labels>` or `VideoVectorLabels`) |

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
        "closed": false,
        "vertices": [
          { "id": "point-1", "x": 25.0, "y": 30.0, "prevPointId": null, "isBezier": false },
          { "id": "point-2", "x": 75.0, "y": 70.0, "prevPointId": "point-1", "isBezier": false }
        ]
      },
      {
        "frame": 30,
        "enabled": true,
        "closed": false,
        "vertices": [
          { "id": "point-1", "x": 40.0, "y": 45.0, "prevPointId": null, "isBezier": false },
          { "id": "point-2", "x": 80.0, "y": 60.0, "prevPointId": "point-1", "isBezier": false }
        ]
      }
    ],
    "labels": ["Road"]
  }
}
```
