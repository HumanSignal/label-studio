---
title: RectangleLabels
type: tags
order: 419
meta_title:
meta_description:
---

RectangleLabels tag creates labeled rectangles
Used only for Image

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum available uses of the label |
| [showInline] | <code>boolean</code> | <code>true</code> | Show items in the same visual line |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of rectangle |
| [fillColor] | <code>string</code> |  | Rectangle fill color |
| [strokeColor] | <code>string</code> |  | Stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | Show or hide rotation control |

### Example
```html
<View>
  <RectangleLabels name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </RectangleLabels>
  <Image name="image" value="$image" />
</View>
```
