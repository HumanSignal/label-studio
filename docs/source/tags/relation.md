---
title: Relation
type: tags
order: 420
meta_title: Relation Tags for a Single Relation
meta_description: Label Studio Relation Tags customize Label Studio for a single relation for machine learning and data science projects.
---

Relation tag represents a single relation label

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | value of the relation |
| [background] | <code>string</code> | background color of active label |

### Example
```html
<View>
  <Relations>
    <Relation value="hello" />
    <Relation value="world" />
  </Relations>

  <Text name="txt-1" value="$text" />
  <Labels name="lbl-1" toName="txt-1">
    <Label value="Relevant" />
    <Label value="Not Relevant" />
  </Labels>
</View>
```
