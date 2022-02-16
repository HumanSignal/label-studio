---
title: Shortcut
type: tags
order: 424
meta_title: Shortcut Tag to Define Shortcuts
meta_description: Customize Label Studio to define keyboard shortcuts and hotkeys to accelerate labeling for machine learning and data science projects.
---

Use the Shortcut tag to define a shortcut that annotators can use to add a predefined object, such as a specific label value, with a hotkey or keyboard shortcut.

Use with the following data types: audio, image, HTML, paragraphs, text, time series, video

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | The value of the shortcut |
| [alias] | <code>string</code> | Shortcut alias |
| [hotkey] | <code>string</code> | Hotkey |

### Example
```html
<!--Basic labeling configuration to add a shortcut that places the text SILENCE in a given Text Area while doing transcription -->
<View>
  <TextArea name="txt-1">
    <Shortcut alias="Silence" value="SILENCE" hotkey="ctrl+1" />
  </TextArea>
</View>
```
