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

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Image name="image" value="$captioning"/>
  <Header value="Describe the image:"/>
  <TextArea name="caption" toName="image" placeholder="Enter description here..." rows="5" maxSubmissions="1"/>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Image](/tags/image.html) object tag to specify the image to caption:
```xml
<Image name="image" value="$captioning"/>
```

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Describe the image:"/>
```

Use the [TextArea](/tags/textarea.html) control tag to provide a 5 row text box that annotators can type a caption into:
```xml
<TextArea name="caption" toName="image" placeholder="Enter description here..." rows="5" maxSubmissions="1"/>
```
Use the `placeholder` argument to provide placeholder text to the annotator, which can provide an example or further instructions. 

## Related tags

- [Image](/tags/image.html)
- [Header](/tags/header.html)
- [TextArea](/tags/textarea.html)
