---
title: Header
type: tags
order: 502
meta_title: Header Tags to Show Headers
meta_description: Label Studio Header Tags customize Label Studio to show headers for machine learning and data science projects.
---

Use the Header tag to show a header.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| value | <code>string</code> |  | Text of header |
| [size] | <code>number</code> | <code>4</code> | Size of header |
| [style] | <code>string</code> |  | CSS style string |
| [underline] | <code>boolean</code> | <code>false</code> | Whether to underline the header |

### Example
```html
<View>
  <Header name="text-1" value="$text" />
</View>
```
### Example
```html
<View>
  <Header name="text-1" value="Please select the class" />
</View>
```
