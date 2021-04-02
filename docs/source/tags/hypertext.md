---
title: HyperText
type: tags
order: 303
meta_title: Hypertext Tags for Hypertext Markup (HTML)
meta_description: Label Studio Hypertext Tags customize Label Studio for hypertext markup (HTML) for machine learning and data science projects.
---

HyperText tag shows an HyperText markup that can be labeled

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| value | <code>string</code> |  | value of the element |
| [valueType] | <code>url</code> \| <code>text</code> |  | where is the text stored — directly in task or should be loaded by url |
| [saveTextResult] | <code>yes</code> \| <code>no</code> |  | store labeled text along with result or not; by default doesn't store text for `valueType=url` |
| [showLabels] | <code>boolean</code> | <code>false</code> | show labels next to the region |
| [encoding] | <code>string</code> | <code>&quot;none|base64|base64unicode&quot;</code> | decode value from encoded string |
| [clickableLinks] | <code>boolean</code> | <code>false</code> | allow to open resources from links |

### Example
```html
<View>
  <HyperText name="text-1" value="$text" />
</View>
```
