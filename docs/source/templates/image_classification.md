---
title: Image Classification
type: templates
category: Computer Vision
cat: computer-vision
order: 106
meta_title: Image Classification Data Labeling Template
meta_description: Template for classifying image data with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/image-classification.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to train a model to identify the type of content in images, for example for a content moderation use case, use this template to perform image classification with checkboxes.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Image name="image" value="$image"/>
  <Choices name="choice" toName="image">
    <Choice value="Adult content"/>
    <Choice value="Weapons" />
    <Choice value="Violence" />
  </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Image](/tags/image.html) object tag to specify the image to classify:
```xml
<Image name="image" value="$image"/>
```

Use the [Choices](/tags/choices.html) control tag to display the choices available to classify the image:
```xml
  <Choices name="choice" toName="image">
    <Choice value="Adult content"/>
    <Choice value="Weapons" />
    <Choice value="Violence" />
  </Choices>
```
You can modify the values of the [Choice](/tags/choice.html) tag to provide different classification options. Review the available arguments for the Choices tag for customization options. 

## Enhance this template

You can enhance this template in many ways.

### Add a sticky left column

If you want the classification choices to appear to the left of the image, you can add styling to the [View](/tags/view.html) tag. 

```xml
<View style="display: flex;">
  <View style="padding: 0em 1em; background: #f1f1f1; margin-right: 1em; border-radius: 3px">
    <View style="position: sticky; top: 0">
    <Choices name="choice" toName="image">
        <Choice value="Adult content"/>
        <Choice value="Weapons" />
        <Choice value="Violence" />
    </Choices>
    </View>
  </View>
    
  <View>
    <Image name="image" value="$image"/>
  </View>
</View>

```

## Related tags

- [Image](/tags/image.html)
- [Choices](/tags/choices.html)