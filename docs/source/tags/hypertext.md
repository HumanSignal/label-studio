---
title: HyperText
type: tags
order: 303
---

HyperText tag shows an HyperText markup that can be labeled

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| value | <code>string</code> |  | value of the element |
| [showLabels] | <code>boolean</code> | <code>false</code> | show labels next to the region |
| [encoding] | <code>string</code> | <code>&quot;none|base64|base64unicode&quot;</code> | decode value from encoded string |
| [clickableLinks] | <code>boolean</code> | <code>false</code> | allow to open resources from links |

### Example
```html
<View>
  <HyperText name="text-1" value="$text" />
</View>
```
