---
title: Ellipse
type: tags
order: 404
meta_title: Ellipse Tags for Adding Elliptical Bounding Box to Images
meta_description: Label Studio Ellipse Tags customize Label Studio to add elliptical bounding boxes to images for machine learning and data science projects.
---

Ellipse
Ellipse is used to add ellipse (elleptic Bounding Box) to an image

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the image to label |
| [opacity] | <code>float</code> | <code>0.6</code> | opacity of ellipse |
| [fillColor] | <code>string</code> |  | rectangle fill color, default is transparent |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | width of the stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | show or hide rotation handle |

### Example
```html
<View>
  <Ellipse name="ellipse1-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
