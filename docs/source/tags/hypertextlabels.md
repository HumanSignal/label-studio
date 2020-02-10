---
title: HyperTextLabels
type: tags
order: 408
---

Use HyperTextLabels tag with HyperText objects. 

### Parameters

-   `name` **[string]** name of the element
-   `toname` **[string]** name of the image to label

### Examples

```html
<View>
  <HyperTextLabels name="type" toName="html-1">
    <Label alias="B" value="Brand"></Label>
    <Label alias="P" value="Product"></Label>
  </HyperTextLabels>
  <HyperText name="html-1" value="$text"></HyperText>
</View>
```