---
title: Shortcut
type: tags
order: 421
---

Shortcut tag can be used to define a shortcut, which adds a predefined object

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
    <Shortcut alias="Silence" value="SILENCE" hotkey="ctrl+1" />
  </TextArea>
</View>
```
