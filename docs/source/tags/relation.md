---
title: Relation
type: tags
order: 423
meta_title: Relation Tag for a Single Relation
meta_description: Customize Label Studio by using the Relation tag to add a single consistent label to relations between regions in machine learning and data science projects.
---

The Relation tag represents a single relation label. Use with the Relations tag to specify the value of a label to apply to a relation between regions.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Value of the relation |
| [background] | <code>string</code> | Background color of the active label in hexadecimal |

### Example

Basic labeling configuration to apply the label "similar" to a relation identified between two labeled regions of text

```html
<View>
  <Relations>
    <Relation value="similar" />
  </Relations>

  <Text name="txt-1" value="$text" />
  <Labels name="lbl-1" toName="txt-1">
    <Label value="Relevant" />
    <Label value="Not Relevant" />
  </Labels>
</View>
```
