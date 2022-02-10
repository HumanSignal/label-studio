---
title: Image Captioning
type: templates
category: Computer Vision
cat: computer-vision
order: 105
meta_title: Image Captioning Data Labeling Template
meta_description: Template for adding captions to images with Label Studio for your machine learning and data science projects.
---

If you want to train a machine learning model to caption or add alt text to images, use this template to collect captions about images. 

## Labeling Configuration

```html
<View>
  <Image name="image" value="$captioning"/>
  <Header value="Describe the image:"/>
  <TextArea name="caption" toName="image" placeholder="Enter description here..." rows="5" maxSubmissions="1"/>
</View>
```

## Related tags

- [Image](/tags/image.html)
- [TextArea](/tags/textarea.html)