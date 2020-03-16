---
title: EllipseLabels
type: tags
order: 416
is_new: t
---

EllipseLabels tag creates labeled ellipses. Used to create an ellipse on the image 

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the image to label |
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
