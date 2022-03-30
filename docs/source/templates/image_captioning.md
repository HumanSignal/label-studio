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

## Enhance this template

You can enhance this template in many ways.

### Add a sticky header so that you can always view the caption

If you want to always view the annotation options on the labeling interface, even if you need to scroll around on the image or data being labeled, you can use styling with the [View](/tags/view.html) tag to specify the position.

In this case, wrap the caption element in styled [View](/tags/view.html) tags:
```xml
 <View style="padding: 0 1em; margin: 1em 0; background: #f1f1f1; position: sticky; top: 0; border-radius: 3px">
  <TextArea name="caption" toName="image" placeholder="Enter description here..." rows="5" maxSubmissions="1"/>
 </View>
```
The `position: sticky; top: 0;` CSS sets the [TextArea](/tags/textarea.html) to be fixed at the top of the screen after the annotator scrolls down when viewing the task. The other styling options visually differentiate the section of the interface containing the text box from the rest of the interface.

## Related tags

- [Image](/tags/image.html)
- [Header](/tags/header.html)
- [TextArea](/tags/textarea.html)
