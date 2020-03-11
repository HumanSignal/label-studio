---
title: Shortcut
type: tags
order: 509
---

Shortcut helps you predefine label objects that you can add in one click. Right now Shortcuts are supported only for the TextArea tag.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | A value of the shortcut |
| [alias] | <code>string</code> | Shortcut alias |
| [hotkey] | <code>string</code> | Hotkey |

### Example  
```html
<View>
  <TextArea name="txt-1">
    <Shortcut alias="Silence" value="<SILENCE>" hotkey="ctrl+1" />
  </TextArea>
</View>
```
