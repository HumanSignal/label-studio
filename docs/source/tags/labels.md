---
title: Labels
type: tags
order: 411
---

Labels tag, create a group of labels

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the element that you want to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | configure if you can select just one or multiple labels |
| [maxUsages] | <code>number</code> |  | maximum available usages |
| [required] | <code>boolean</code> | <code>false</code> | validation if label is required |
| [requiredMessage] | <code>string</code> |  | message to show if validation fails |
| [showInline] | <code>boolean</code> | <code>true</code> | show items in the same visual line |

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
