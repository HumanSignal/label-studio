---
title: Image Captioning
type: templates
category: Computer Vision
cat: computer-vision
order: 105
meta_title: 
meta_description:
---

## Labeling Configuration

```html
<View>
  <Image name="image" value="$captioning"/>
  <Header value="Describe the image:"/>
  <TextArea name="caption" toName="image" placeholder="Enter description here..." rows="5" maxSubmissions="1"/>
</View>
```