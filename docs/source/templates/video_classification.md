---
title: Video Classification
type: templates
category: Videos
cat: videos
order: 801
meta_title: Video Classification Data Labeling Template
meta_description: Template for video classification tasks with Label Studio for your machine learning and data science projects.
---

If you want to build a video classification machine learning model, for example for content moderation or training use cases, you want a relevant dataset of classified videos. Use this template to classify videos. 

You can build a video classifier using the HyperText tag or the Video tag.

## Labeling Configuration
Using the HyperText tag:

```html
<View>
  <Choices name="type" toName="video" choice="single-radio">
    <Choice value="Motion"></Choice>
    <Choice value="Stable"></Choice>
  </Choices>
  <HyperText name="video" value="$html"></HyperText>
</View>
<!-- { "html": "<embed src='https://www.youtube.com/embed/mf9TKj0NuTQ'></embed>" } -->
```

The preview for this config uses a sample data input, so it won't display your task with the video. 

### Input data

To use this labeling configuration, prepare input data like the following example using the HTML video tag:

```json 
[
 { "html": "<video src='examples.com/1.mp4'>" },
 { "html": "<video src='examples.com/2.mp4'>" }
]
```

You can also embed videos available on the web:
 
```json 
[
  { "html": "<embed src='https://www.youtube.com/embed/mf9TKj0NuTQ'></embed>" }
]
```

Read more about the HTML video tag 
<a href="https://www.w3schools.com/tags/att_video_src.asp">on the W3 Schools website</a>.

## Labeling Configuration

Use the Video tag: 

```html
<View>
  <Video name="video" value="$video"/>
  <Choices name="choice" toName="video" showInLine="true">
    <Choice value="Blurry" />
    <Choice value="Sharp" />
  </Choices>
</View>
```

## Related tags

- [Video](/tags/video.html)
- [HyperText](/tags/hypertext.html)
- [Choices](/tags/choices.html)