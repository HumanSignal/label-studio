---
title: Image Captioning
type: templates
category: Computer Vision
cat: computer-vision
order: 105
meta_title: Image Captioning Data Labeling Template
meta_description: Template for adding captions to images with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/image-captioning.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to train a machine learning model to caption or add alt text to images, use this template to collect captions about images. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Image object tag to specify the image to caption.-->
  <Image name="image" value="$captioning"/>
    <!--Use the Header tag to provide instructions to annotators.-->
  <Header value="Describe the image:"/>
    <!--Use the TextArea control tag to provide a 5 row text box that annotators can type a caption into.-->
  <TextArea name="caption" toName="image" placeholder="Enter description here..." rows="5" maxSubmissions="1"/>
</View>
```

## Related tags

- [Image](/tags/image.html)
- [Header](/tags/header.html)
- [TextArea](/tags/textarea.html)