---
title: Text
type: tags
order: 305
---

RichText tag shows text or HTML and allows labeling

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| value | <code>string</code> |  | value of the element |
| [valueType] | <code>url</code> \| <code>text</code> | <code>url|text</code> | – source of the data |
| [inline] | <code>boolean</code> | <code>false</code> | whether to embed html directly to LS or use iframe (only HyperText) |
| [saveTextResult] | <code>boolean</code> | <code>true</code> | – whether or not to save selected text to the serialized data |
| [selectionEnabled] | <code>boolean</code> | <code>true</code> | enable or disable selection |
| [clickableLinks] | <code>boolean</code> | <code>false</code> | – allow annotator to open resources from links |
| [highlightColor] | <code>string</code> |  | hex string with highlight color, if not provided uses the labels color |
| [showLabels] | <code>boolean</code> | <code>true</code> | whether or not to show labels next to the region |
| [encoding] | <code>none</code> \| <code>base64</code> \| <code>base64unicode</code> |  | decode value from an encoded string |
| [granularity] | <code>symbol</code> \| <code>word</code> \| <code>sentence</code> \| <code>paragraph</code> |  | control region selection granularity |

### Example
```html
<RichText name="text-1" value="$text" granularity="symbol" highlightColor="#ff0000" />
```
### Example
```html
<Text name="text-1" value="$url" valueType="url" highlightColor="#ff0000" />
```
### Example
```html
<HyperText name="text-1" value="$html" highlightColor="#ff0000" />
```
