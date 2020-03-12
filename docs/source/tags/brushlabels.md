---
title: BrushLabels
type: tags
order: 418
is_new: t
---

BrushLabels tag creates segmented labeling

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name of the element |
| toName | <code>string</code> | name of the image to label |

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
