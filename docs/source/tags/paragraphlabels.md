---
title: ParagraphLabels
type: tags
order: 414
is_new: t
---

ParagraphLabels tag
ParagraphLabels tag creates labeled paragraph

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name of the element |
| toName | <code>string</code> | name of the html element to label |

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
