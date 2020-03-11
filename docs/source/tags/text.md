---
title: Text
type: tags
order: 304
---

Text tag shows an Text markup that can be labeled

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| value | <code>string</code> |  | value of the element |
| [selectionEnabled] | <code>boolean</code> | <code>true</code> | enable or disable selection |
| [highlightColor] | <code>string</code> |  | hex string with highlight color, if not provided uses the labels color |
| [granularity] | <code>symbol</code> \| <code>word</code> | <code>symbol</code> | control per symbol or word selection |
| [showLabels] | <code>boolean</code> | <code>true</code> | show labels next to the region |
| [encoding] | <code>string</code> | <code>&quot;string|base64&quot;</code> | decode value from a plain or base64 encoded string |

### Example  
```html
<Text name="text-1" value="$text" granularity="symbol" highlightColor="#ff0000" />
```
