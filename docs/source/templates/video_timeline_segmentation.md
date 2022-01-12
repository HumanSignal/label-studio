---
title: Video Timeline Segmentation
type: templates
category: Videos
cat: videos
order: 802
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
  <Header value="Video timeline segmentation via AudioPlus sync trick"/>
  <Video name="video" value="$video_url" sync="audio"/>
  <Labels name="tricks" toName="audio" choice="multiple">
    <Label value="Kickflip" background="#1BB500"/>
    <Label value="360 Flip" background="#FFA91D"/>
    <Label value="Trick" background="#358EF3"/>
  </Labels>
  <AudioPlus name="audio" value="$video_url" sync="video" speed="false"/>
</View>
```