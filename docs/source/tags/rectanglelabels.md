---
title: RectangleLabels
type: tags
order: 422
meta_title: Rectangle Label Tag to Label Rectangle Bounding Box in Images
meta_description: Customize Label Studio with the RectangleLabels tag and add labeled rectangle bounding boxes in images for semantic segmentation and object detection machine learning and data science projects.
---

The `RectangleLabels` tag creates labeled rectangles. Use to apply labels to bounding box semantic segmentation tasks.

Use with the following data types: image.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum number of times a label can be used per task |
| [showInline] | <code>boolean</code> | <code>true</code> | Show labels in the same visual line |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of rectangle |
| [fillColor] | <code>string</code> |  | Rectangle fill color in hexadecimal |
| [strokeColor] | <code>string</code> |  | Stroke color in hexadecimal |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | Show or hide rotation control <!-- Rotation section --> ### Rotation Note that when you rotate rectangles, the anchor point is different depending on how you perform the rotation. **Rectangle rotation in Label Studio UI** If you rotate using your mouse in the labeling interface, the rotation anchor point is the center of the rectangle. ![Diagram showing mouse rotation](../images/rectangle_ui_rotation.jpg) **Rectangle rotation in the Label Studio database** If you rotate by directly editing the rotation angle under the **Info** panel of the labeling interface, the rotation anchor point is the top left. This is also how it is saved in the Label Studio database (regardless of how you performed the rotation). ![Diagram showing DB rotation](../images/rectangle_db_rotation.jpg) |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| original_width | <code>number</code> | width of the original image (px) |
| original_height | <code>number</code> | height of the original image (px) |
| image_rotation | <code>number</code> | rotation degree of the image (deg) |
| value | <code>Object</code> |  |
| value.x | <code>number</code> | x coordinate of the top left corner before rotation (0-100) |
| value.y | <code>number</code> | y coordinate of the top left corner before rotation (0-100) |
| value.width | <code>number</code> | width of the bounding box (0-100) |
| value.height | <code>number</code> | height of the bounding box (0-100) |
| value.rotation | <code>number</code> | rotation degree of the bounding box (deg) |

### Example JSON
```json
{
  "original_width": 1920,
  "original_height": 1280,
  "image_rotation": 0,
  "value": {
    "x": 3.1,
    "y": 8.2,
    "width": 20,
    "height": 16,
    "rectanglelabels": ["Car"]
  }
}
```

### Example

Basic labeling configuration for applying labels to rectangular bounding boxes on an image

```html
<View>
  <RectangleLabels name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </RectangleLabels>
  <Image name="image" value="$image" />
</View>
```
