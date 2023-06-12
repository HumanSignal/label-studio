---
title: Video Timeline Segmentation
type: templates
category: Videos
cat: videos
order: 802
meta_title: Video Timeline Segmentation Data Labeling Template
meta_description: Template for segmenting videos on a timeline with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/video-timeline-segmentation.png" alt="" class="gif-border" width="552px" height="408px" />

To more easily identify video timelines, label segments alongside the audio channel of the video using video timeline segmentation. Use this template if you want to label the audio segment of a video on a timeline. 

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Header value="Video timeline segmentation via Audio sync trick"/>
  <Video name="video" value="$video_url" sync="audio"/>
  <Labels name="tricks" toName="audio" choice="multiple">
    <Label value="Kickflip" background="#1BB500"/>
    <Label value="360 Flip" background="#FFA91D"/>
    <Label value="Trick" background="#358EF3"/>
  </Labels>
  <Audio name="audio" value="$video_url" sync="video" speed="false"/>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Video timeline segmentation via Audio sync trick"/>
```

Use the Video object tag to provide a video clip and sync it with the audio clip:
```xml
<Video name="video" value="$video_url" sync="audio"/>
```

Use the Labels control tag to highlight the video clip with specific actions:
```xml
<Labels name="tricks" toName="audio" choice="multiple">
    <Label value="Kickflip" background="#1BB500"/>
    <Label value="360 Flip" background="#FFA91D"/>
    <Label value="Trick" background="#358EF3"/>
</Labels>
```

Use the Audio object tag to play the audio from the video clip with the video:
```xml
<Audio name="audio" value="$video_url" sync="video" speed="false"/>
```

## Related tags

- [Header](/tags/header.html)
- [Video](/tags/video.html)
- [Labels](/tags/labels.html)
- [Audio](/tags/audio.html)
