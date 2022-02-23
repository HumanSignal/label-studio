---
title: Video Object Detection
type: templates
category: Videos
cat: videos
order: 803
is_new: t
meta_title: Video Object Detection Data Labeling Template
meta_description: Template for detecting objects in videos with Label Studio for your machine learning and data science projects.
---

## Labeling Configuration

```html
  <View>
     <Header>Label the video:</Header>
     <Video name="video" value="$video" framerate="25.0"/>
     <VideoRectangle name="box" toName="video" />
     <Labels name="videoLabels" toName="video" allowEmpty="true">
       <Label value="Man" background="blue"/>
       <Label value="Woman" background="red"/>
       <Label value="Other" background="green"/>
     </Labels>
  </View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header>Label the video:</Header>
```

Use the [Video](/tags/video.html) object tag to specify the video data. The `framerate` parameter sets the frame rate of all videos in the project. 
```xml
<Video name="video" value="$video" framerate="25.0"/>
```
     
Use the [VideoRectangle](/tags/videorectangle.html) control tag to allow annotators to add rectangles to video frames:
```xml
<VideoRectangle name="box" toName="video" />
```

Use the [Labels](/tags/labels.html) control tag to specify labels that can be added to the rectangle regions added to the video frames:
```xml
<Labels name="videoLabels" toName="video" allowEmpty="true">
    <Label value="Man" background="blue"/>
    <Label value="Woman" background="red"/>
    <Label value="Other" background="green"/>
</Labels>
```

## Related tags
- [Video](/tags/video.html)
- [VideoRectangle](/tags/videorectangle.html)
- [Labels](/tags/labels.html)
