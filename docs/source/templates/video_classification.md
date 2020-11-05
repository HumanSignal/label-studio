---
title: Video Classifier
type: templates
order: 501
---

You can build simple video classifier using HyperText tag.

<img src="/images/screens/video_classification.png" class="img-template-example" title="Video Classifier" /> 

## Input data

You need to prepare input data like this, read more about HTML video tag 
<a href="https://www.w3schools.com/tags/att_video_src.asp">here</a>: 

```json 
[
 { "html": "<video src='examples.com/1.mp4'>" },
 { "html": "<video src='examples.com/2.mp4'>" }
]
```

Or you can even use embeds from Youtube:
 
```json 
[
 { "html": "<iframe src='https://www.youtube.com/embed/mf9TKj0NuTQ'></iframe>" }
]
```

## Config 

```html
<View>
  <Choices name="type" toName="video" choice="single-radio">
    <Choice value="Motion"></Choice>
    <Choice value="Stable"></Choice>
  </Choices>
  <HyperText name="video" value="$html"></HyperText>
</View>
<!-- { "html": "<iframe src='https://www.youtube.com/embed/mf9TKj0NuTQ'></iframe>" } -->
```

Note: preview for this config uses another sample input data, so it won't display the proper task with the video.  
