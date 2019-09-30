---
title: Label
type: tags
order: 404
---

## Label

Label tag represents a single label

### Parameters

-   `value` **[string]** A value of the label
-   `selected` **[boolean]** If this label should be preselected
-   `alias` **[string]** Label alias
-   `hotkey` **[string]** Hotkey
-   `showalias` **[boolean]** Show alias inside label text
-   `aliasstyle` **[string]** Alias CSS style default=opacity: 0.6
-   `size` **[string]** Size of text in the label
-   `background` **[string]** The background color of active label
-   `selectedColor` **[string]** Color of text in an active label

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
