---
title: EllipseLabels
type: tags
order: 405
meta_title: Ellipse Label Tags for Labeling Images with Elliptical Bounding Boxes
meta_description: Label Studio Ellipse Label Tags customize Label Studio for labeling images with elliptical bounding boxes for machine learning and data science projects.
---

EllipseLabels tag creates labeled ellipses
Used only for Image

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum available uses of the label |
| [showInline] | <code>boolean</code> | <code>true</code> | Show items in the same visual line |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of ellipse |
| [fillColor] | <code>string</code> |  | Ellipse fill color |
| [strokeColor] | <code>string</code> |  | Stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | Show or hide rotation handle |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| original_width | <code>number</code> | width of the original image (px) |
| original_height | <code>number</code> | height of the original image (px) |
| image_rotation | <code>number</code> | rotation degree of the image (deg) |
| value | <code>Object</code> |  |
| value.x | <code>number</code> | x coordinate of the top left corner before rotation (0-100) |
| value.y | <code>number</code> | y coordinate of the top left corner before rotation (0-100) |
| value.radiusX | <code>number</code> | radius by x axis (0-100) |
| value.radiusY | <code>number</code> | radius by y axis (0-100) |
| value.rotation | <code>number</code> | rotation degree (deg) |

### Example JSON
```json
{
  "original_width": 1920,
  "original_height": 1280,
  "image_rotation": 0,
  "value": {
    "x": 3.1,
    "y": 8.2,
    "radiusX": 20,
    "radiusY": 16,
    "ellipselabels": ["Car"]
  }
}
```

### Example
```html
<View>
  <EllipseLabels name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </EllipseLabels>
  <Image name="image" value="$image" />
</View>
```
