---
title: Label
type: tags
order: 409
meta_title: Label Tags for Single Label Tags
meta_description: Label Studio Label Tags customize Label Studio with single label tags for machine learning and data science projects.
---

Label tag represents a single label.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| value | <code>string</code> |  | Value of the label |
| [selected] | <code>boolean</code> | <code>false</code> | Whether to preselect this label |
| [maxUsages] | <code>number</code> |  | Maximum available uses of the label |
| [hotkey] | <code>string</code> |  | Hotkey to use for the label. Automatically generated if not specified |
| [alias] | <code>string</code> |  | Label alias |
| [showAlias] | <code>boolean</code> | <code>false</code> | Whether to show alias inside label text |
| [aliasStyle] | <code>string</code> | <code>&quot;opacity:0.6&quot;</code> | Alias CSS style |
| [size] | <code>string</code> | <code>&quot;medium&quot;</code> | Size of text in the label |
| [background] | <code>string</code> | <code>&quot;#36B37E&quot;</code> | Background color of an active label |
| [selectedColor] | <code>string</code> | <code>&quot;#ffffff&quot;</code> | Color of text in an active label |
| [granularity] | <code>symbol</code> \| <code>word</code> |  | Set control based on symbol or word selection (only for Text) |

### Example
```html
<View>
  <Labels name="type" toName="txt-1">
    <Label alias="B" value="Brand" />
    <Label alias="P" value="Product" />
  </Labels>
  <Text name="txt-1" value="$text" />
</View>
```
