---
title: Shortcut
type: tags
order: 410
---

Shortcut helps you predefine label objects that you can add in one click. Right now Shortcuts are supported only for the TextArea tag.

### Parameters

-   `value` **[string]** value to add to the object
-   `alias` **[string]?** alias to show on label
-   `hotkey` **[string]** hotkey

### Examples

```html
<View>
  <TextArea name="ta">
    <Shortcut value="<SILENCE>" alias="Silence" hotkey="ctrl+1" />
  </TextArea>
</View>
```
