---
title: HyperTextLabels
type: tags
order: 406
meta_title: Hypertext Label Tags to Create Labeled Hypertext (HTML)
meta_description: Label Studio Hypertext Label Tags customize Label Studio to create labeled hypertext (HTML) for machine learning and data science projects.
---

HyperTextLabels tag creates labeled hyper text (HTML)

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the html element to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | configure if you can select just one or multiple labels |
| [maxUsages] | <code>number</code> |  | maximum available usages |
| [showInline] | <code>boolean</code> | <code>true</code> | show items in the same visual line |

### Example
```html
<View>
  <HyperTextLabels name="labels" toName="ht">
    <Label value="Face" />
    <Label value="Nose" />
  </HyperTextLabels>
  <HyperText name="ht" value="$html" />
</View>
```
