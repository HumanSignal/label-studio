---
title: ParagraphLabels
type: tags
order: 416
meta_title: Paragraph Label Tag for Paragraph Labels
meta_description: Customize Label Studio with paragraph labels for machine learning and data science projects.
---

The ParagraphLabels tag creates labeled paragraphs. Use with the Paragraphs tag to label a paragraph of text.

Use with the following data types: paragraphs

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the paragraph element to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum number of times a label can be used per task |
| [showInline] | <code>boolean</code> | <code>true</code> | Show labels in the same visual line |

### Example
```html
<!--Basic labeling configuration to label paragraphs -->
<View>
  <ParagraphLabels name="labels" toName="prg">
    <Label value="Statement" />
    <Label value="Question" />
  </ParagraphLabels>
  <Paragraphs name="prg" value="$dialogue" layout="dialogue" />
</View>
```
