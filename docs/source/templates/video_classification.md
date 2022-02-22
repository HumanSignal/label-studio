---
title: Video Classification
type: templates
category: Videos
cat: videos
order: 801
meta_title: Video Classification Data Labeling Template
meta_description: Template for video classification tasks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/video-classification.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to build a video classification machine learning model, for example for content moderation or training use cases, you want a relevant dataset of classified videos. Use this template to classify videos. 

You can build a video classifier using the HyperText tag or the Video tag.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration
Using the HyperText tag:

```html
<View>
    <!--Use the Choices control tag to provide a single choice for annotators
    to use to classify the video-->
  <Choices name="type" toName="video" choice="single-radio">
    <Choice value="Motion"></Choice>
    <Choice value="Stable"></Choice>
  </Choices>
    <!--Use the HyperText tag to display video clips to annotators in Label Studio-->
  <HyperText name="video" value="$html"></HyperText>
</View>
<!-- { "html": "<embed src='https://www.youtube.com/embed/mf9TKj0NuTQ'></embed>" } -->
```

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
    <!--Use the Video object tag to display video clips in Label Studio Enterprise-->
  <Video name="video" value="$video"/>
    <!--Use the Choices control tag to provide classification options to annotators-->
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