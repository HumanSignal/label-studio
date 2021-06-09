---
title: Shortcut
type: tags
order: 422
meta_title: Shortcut Tags to Define Shortcuts
meta_description: Label Studio Shortcut Tags customize Label Studio to define keyboard shortcuts and hotkeys for machine learning and data science projects.
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
