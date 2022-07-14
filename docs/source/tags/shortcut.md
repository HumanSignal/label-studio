---
title: Shortcut
type: tags
order: 425
meta_title: Shortcut Tag to Define Shortcuts
meta_description: Customize Label Studio to define keyboard shortcuts and hotkeys to accelerate labeling for machine learning and data science projects.
---

Use the Shortcut tag to define a shortcut that annotators can use to add a predefined object, such as a specific label value, with a hotkey or keyboard shortcut.

Use with the following data types:
- Audio
- Image
- HTML
- Paragraphs
- Text
- Time series
- Video

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| value | <code>string</code> |  | The value of the shortcut |
| [alias] | <code>string</code> |  | Shortcut alias |
| [hotkey] | <code>string</code> |  | Hotkey |
| [background] | <code>string</code> | <code>&quot;#333333&quot;</code> | Background color in hexadecimal |

### Example
```html
<!--
Basic labeling configuration to add a shortcut that places the text SILENCE in a given Text Area while doing transcription.

Note: The default background color for the Shortcut tag is grey color.

You can change the background color using text or hexadecimal format in the `background` parameter.
-->
<View>
  <TextArea name="txt-1">
    <Shortcut alias="Silence" value="SILENCE" hotkey="ctrl+1" background="#3333333" />
  </TextArea>
</View>
```
