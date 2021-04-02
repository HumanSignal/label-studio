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
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the image to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | configure if you can select just one or multiple labels |
| [maxUsages] | <code>number</code> |  | maximum available usages |
| [showInline] | <code>boolean</code> | <code>true</code> | show items in the same visual line |
| [opacity] | <code>float</code> | <code>0.6</code> | opacity of rectangle |
| [fillColor] | <code>string</code> |  | ellipse fill color, default is transparent |
| [strokeColor] | <code>string</code> |  | stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | width of stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | show or hide rotation handle |

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
