---
title: Labels
type: guide
order: 403
---

## Labels

Labels tag, create a group of labels

### Parameters

-   `name` **[string]** name of the element
-   `toName` **[string]** name of the element that you want to label
-   `choice` **(single | multiple)** configure if you can select just one or multiple labels (optional, default `single`)

### Examples

```html
<View>
  <Labels name="type" toName="txt-1">
    <Label alias="B" value="Brand"></Label>
    <Label alias="P" value="Product"></Label>
  </Labels>
  <Text name="txt-1" value="$text"></Text>
</View>
```
