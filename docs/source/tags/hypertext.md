---
title: HyperText
type: tags
order: 305
---

HyperText tag shows an HTML markup that can be labeled

### Parameters

-   `name` **[string]** of the element
-   `value` **[string]** of the element
-   `encoding` ["string"|"base64"] provide the html as an escaped string or base64 encoded string

### Examples

```html
<View>
  <Labels name="type" toName="html-1">
    <Label alias="B" value="Brand"></Label>
    <Label alias="P" value="Product"></Label>
  </Labels>
  <HyperText name="html-1" value="$text"></HyperText>
</View>
```
