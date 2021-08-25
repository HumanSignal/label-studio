---
title: ParagraphLabels
type: tags
order: 415
meta_title: Paragraph Label Tags for Paragraph Labels
meta_description: Label Studio Paragraph Label Tags customize Label Studio with paragraph labels for machine learning and data science projects.
---

ParagraphLabels tag
ParagraphLabels tag creates labeled paragraph

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the HTML element to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum available uses of a label |
| [showInline] | <code>boolean</code> | <code>true</code> | Show items in the same visual line |

### Example
```html
<View>
  <ParagraphLabels name="labels" toName="prg">
    <Label value="Statement" />
    <Label value="Question" />
  </ParagraphLabels>
  <Paragraphs name="prg" value="$dialogue" layout="dialogue" />
</View>
```
