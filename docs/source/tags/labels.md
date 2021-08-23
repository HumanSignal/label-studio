---
title: Labels
type: tags
order: 410
meta_title: Labels Tags for Label Groups
meta_description: Label Studio Labels Tags customize Label Studio with label groups for machine learning and data science projects.
---

Labels tag, create a group of labels.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum available uses of the label |
| [showInline] | <code>boolean</code> | <code>true</code> | Show items in the same visual line |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of rectangle |
| [fillColor] | <code>string</code> |  | Rectangle fill color |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |

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
