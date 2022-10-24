---
title: Brush
type: tags
order: 401
meta_title: Brush Tag for Image Segmentation Labeling
meta_description: Customize Label Studio with brush tags for image segmentation labeling for machine learning and data science projects.
---

Use the Brush tag for image segmentation tasks where you want to apply a mask or use a brush to draw a region on the image.

Use with the following data types: image

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether the data labeler can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum number of times a label can be used per task |
| [showInline] | <code>boolean</code> | <code>true</code> | Show labels in the same visual line |
| [smart] | <code>boolean</code> |  | Show smart tool for interactive pre-annotations |
| [smartOnly] | <code>boolean</code> |  | Only show smart tool for interactive pre-annotations |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| original_width | <code>number</code> | Width of the original image (px) |
| original_height | <code>number</code> | Height of the original image (px) |
| image_rotation | <code>number</code> | Rotation degree of the image (deg) |
| value | <code>Object</code> |  |
| value.format | <code>&quot;rle&quot;</code> | Format of the masks, only RLE is supported for now |
| value.rle | <code>Array.&lt;number&gt;</code> | RLE-encoded image |

### Example JSON
```json
{
  "original_width": 1920,
  "original_height": 1280,
  "image_rotation": 0,
  "value": {
    "format": "rle",
    "rle": [0, 1, 1, 2, 3],
    "brushlabels": ["Car"]
  }
}
```

### Example
```html
<!--Basic image segmentation labeling configuration-->
<View>
  <Brush name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </Brush>
  <Image name="image" value="$image" />
</View>
```
