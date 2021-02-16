---
title: ParagraphLabels
type: tags
order: 414
---

ParagraphLabels tag
ParagraphLabels tag creates labeled paragraph

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
  <ParagraphLabels name="labels" toName="prg">
    <Label value="Face" />
    <Label value="Nose" />
  </ParagraphLabels>
  <Paragraphs name="prg" value="$dialogue" layout="dialogue" />
</View>
```
