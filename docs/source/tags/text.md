---
title: Text
type: tags
order: 306
---

Text tag shows an Text markup that can be labeled.
You can use `<Style>.htx-text{ white-space: pre-wrap; }</Style>` to preserve all the spaces.
In any case every space counts for result offsets.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| value | <code>string</code> |  | data field with text or url |
| [valueType] | <code>url</code> \| <code>text</code> |  | where is the text stored — directly in task or should be loaded by url |
| [saveTextResult] | <code>yes</code> \| <code>no</code> |  | store labeled text along with result or not; by default doesn't store text for `valueType=url` |
| [selectionEnabled] | <code>boolean</code> | <code>true</code> | enable or disable selection |
| [highlightColor] | <code>string</code> |  | hex string with highlight color, if not provided uses the labels color |
| [granularity] | <code>symbol</code> \| <code>word</code> | <code>symbol</code> | control per symbol or word selection |
| [showLabels] | <code>boolean</code> | <code>true</code> | show labels next to the region |
| [encoding] | <code>string</code> | <code>&quot;none|base64|base64unicode&quot;</code> | decode value from encoded string |

### Example
```html
<View>
  <Text name="text-1" value="$text" granularity="symbol" highlightColor="#ff0000" />
</View>
```
