---
title: Label
type: tags
order: 409
---

Label tag represents a single label

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| value | <code>string</code> |  | value of the label |
| [selected] | <code>boolean</code> | <code>false</code> | if this label should be preselected |
| [maxUsages] | <code>number</code> |  | maximum available usages |
| [hotkey] | <code>string</code> |  | hotkey, if not specified then will be automatically generated |
| [alias] | <code>string</code> |  | label alias |
| [showAlias] | <code>boolean</code> | <code>false</code> | show alias inside label text |
| [aliasStyle] | <code>string</code> | <code>&quot;opacity:0.6&quot;</code> | alias CSS style |
| [size] | <code>string</code> | <code>&quot;medium&quot;</code> | size of text in the label |
| [background] | <code>string</code> |  | background color of an active label |
| [selectedColor] | <code>string</code> |  | color of text in an active label |
| [granularity] | <code>symbol</code> \| <code>word</code> |  | control per symbol or word selection (only for Text) |

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
