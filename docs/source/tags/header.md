---
title: Header
type: tags
order: 503
meta_title: Header Tag to Show Headers
meta_description: Customize Label Studio with the Header tag to display a header for a labeling task for machine learning and data science projects.
---

The `Header` tag is used to show a header on the labeling interface.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| value | <code>string</code> |  | Text of header, either static text or the field name in data to use for the header |
| [size] | <code>number</code> | <code>4</code> | Level of header on a page, used to control size of the text |
| [style] | <code>string</code> |  | CSS style for the header |
| [underline] | <code>boolean</code> | <code>false</code> | Whether to underline the header |

### Example

Display a header on the labeling interface based on a field in the data

```html
<View>
  <Header value="$text" />
</View>
```
### Example

Display a static header on the labeling interface

```html
<View>
  <Header value="Please select the class" />
</View>
```
