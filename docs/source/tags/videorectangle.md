---
title: VideoRectangle
type: tags
order: 429
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

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| value | <code>Object</code> |  |
| value.framesCount | <code>number</code> | total number of frames in the video |
| value.duration | <code>number</code> | duration of the video in seconds |
| value.sequence | <code>number</code> | array of keypoint objects |
| value.sequence[].x | <code>number</code> | x coordinate of the top left corner (0-100) |
| value.sequence[].y | <code>number</code> | y coordinate of the top left corner (0-100) |
| value.sequence[].width | <code>number</code> | width of the bounding box (0-100) |
| value.sequence[].height | <code>number</code> | height of the bounding box (0-100) |
| value.sequence[].rotation | <code>number</code> | rotation degree of the bounding box (deg) |
| value.sequence[].enabled | <code>number</code> | whether the region is visible on this and next frames |
| value.sequence[].frame | <code>number</code> | frame number |
| value.sequence[].time | <code>number</code> | time in seconds |

### Example JSON
```json
{
  "value": {
    "framesCount": 1051,
    "duration": 42.008633,
    "sequence": [
      {
        "x": 16,
        "y": 51,
        "width": 30,
        "height": 28,
        "rotation": 0,
        "enabled": true,
        "frame": 1,
        "time": 0.04
      }, {
        "x": 44.7,
        "y": 51.5,
        "width": 30.1,
        "height": 28.8,
        "rotation": 0,
        "enabled": true,
        "frame": 18,
        "time": 0.72
      }, {
        "x": 44.7,
        "y": 51.5,
        "width": 30.1,
        "height": 28.8,
        "rotation": 0,
        "enabled": false, // this region won't appear on next frames
        "frame": 25,
        "time": 1
      }
    ]
  }
}
```

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
