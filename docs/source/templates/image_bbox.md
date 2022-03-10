---
title: Object Detection with Bounding Boxes
type: templates
category: Computer Vision
cat: computer-vision
order: 103
meta_title: Image Object Detection Data Labeling Template
meta_description: Template for performing object detection with rectangular bounding boxes with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/object-detection-with-bounding-boxes.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to perform object detection, you need to create a labeled dataset. Use this template to add rectangular bounding boxes to images, and label the contents of the bounding boxes.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Image](/tags/image.html) object tag to specify the image to label:
```xml
<Image name="image" value="$image"/>
```
  
Use the [RectangleLabels](/tags/rectanglelabels.html) control tag to add labels and rectangular bounding boxes to your image at the same time. Use the [Label](/tags/label.html) tag to control the color of the boxes:
```xml
  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>
```

## Enhance this template

### Add descriptions to detected objects

If you want to add further context to object detection tasks with bounding boxes, you can add some **per-region** conditional labeling parameters to your labeling configuration. 

For example, to prompt annotators to add descriptions to detected objects, you can add the following to your labeling configuration:
```xml
  <View visibleWhen="region-selected">
    <Header value="Describe object" />
    <TextArea name="answer" toName="image" editable="true"
              perRegion="true" required="true" />
    <Choices name="choices" toName="image"
             perRegion="true">
      <Choice value="Correct"/>
      <Choice value="Broken"/>
    </Choices>
  </View>
```
The `visibleWhen` parameter of the [View](/tags/view.html) tag hides the description prompt from annotators until a bounding box is selected. 

After the annotator selects a bounding box, the [Header](/tags/header.html) appears and provides instructions to annotators.

The [TextArea](/tags/textarea.html) control tag displays an editable text box that applies to the selected bounding box, specified with the `perRegion="true"` parameter. You can also add a `placeholder` parameter to provide suggested text to annotators. 

In addition, you can prompt annotators to provide additional feedback about the content of the bounding box, such as the status of the item in the box, using the [Choices](/tags/choices.html) tag with the `perRegion` parameter.

## Related tags

- [Image](/tags/image.html)
- [RectangleLabels](/tags/rectanglelabels.html)
- [Rectangle](/tags/rectangle.html)
- [Label](/tags/label.html)