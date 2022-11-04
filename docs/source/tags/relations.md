---
title: Relations
type: tags
order: 424
meta_title: Relations Tag for Multiple Relations
meta_description: Customize Label Studio by adding labels to relationships between labeled regions for machine learning and data science projects.
---

Use the Relations tag to create label relations between regions. Use to provide many values to apply to the relationship between two labeled regions.

Use with the following data types: audio, image, HTML, paragraphs, text, time series, video

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |

### Example

Basic labeling configuration to apply the label "similar" or "dissimilar" to a relation identified between two labeled regions of text

```html
<View>
  <Relations>
    <Relation value="similar" />
    <Relation value="dissimilar" />
  </Relations>

  <Text name="txt-1" value="$text" />
  <Labels name="lbl-1" toName="txt-1">
    <Label value="Relevant" />
    <Label value="Not Relevant" />
  </Labels>
</View>
```
