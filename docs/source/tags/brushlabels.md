---
title: BrushLabels
type: tags
order: 401
meta_title: Brush Label Tags for Segmented Image Labeling
meta_description: Label Studio Brush Label Tags customize Label Studio for segmented image labeling for machine learning and data science projects.
---

Use the BrushLabels tag to create segmented labeling for images.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether the data labeler can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | The maximum available uses of a label |
| [showInline] | <code>boolean</code> | <code>true</code> | Show items in the same visual line |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| original_width | <code>number</code> | width of the original image (px) |
| original_height | <code>number</code> | height of the original image (px) |
| image_rotation | <code>number</code> | rotation degree of the image (deg) |
| value | <code>Object</code> |  |
| value.format | <code>&quot;rle&quot;</code> | format of the masks, only RLE is supported for now |
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
<View>
  <BrushLabels name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </BrushLabels>
  <Image name="image" value="$image" />
</View>
```
