---
title: Choice
type: tags
order: 402
---

Choice tag represents a single choice

### Parameters

-   `value` **[string]** label value
-   `selected` **[boolean]?** If this label should be preselected
-   `alias` **[string]?** label alias
-   `hotkey` **[string]?** hokey

### Examples

```html
<View>
  <Choices name="gender" toName="txt-1" choice="single">
    <Choice alias="M" value="Male"></Choice>
    <Choice alias="F" value="Female"></Choice>
  </Choices>
  <Text name="txt-1" value="John went to see Marry"></Text>
</View>
```
