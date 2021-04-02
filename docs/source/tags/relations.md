---
title: Relations
type: tags
order: 421
meta_title: Relations Tags for Multiple Relations
meta_description: Label Studio Relations Tags customize Label Studio for Multiple Relations for machine learning and data science projects.
---

Relations tag, create relations labels

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | configure if you can select just one or multiple labels |

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
