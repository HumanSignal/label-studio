---
title: Choices
type: tags
order: 401
---

Choices tag, create a group of choices, radio, or checkboxes. Shall be used for a single or multi-class classification.

### Parameters

-   `name` **[string]** of the group
-   `toName` **[string]** name of the elements that you want to label
-   `choice` **(single | single-radio | multiple)** single or multi-class (optional, default `single`)
-   `showInline` **[boolean]** show items in the same visual line (optional, default `false`)

### Examples

```html
<View>
  <Choices name="gender" toName="txt-1" choice="single-radio">
    <Choice alias="M" value="Male"></Choice>
    <Choice alias="F" value="Female"></Choice>
  </Choices>
  <Text name="txt-1" value="John went to see Marry"></Text>
</View>
```
