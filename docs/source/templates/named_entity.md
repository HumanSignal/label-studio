---
title: Named Entity Recognition
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 203
meta_title: Text Named Entity Recognition Data Labeling Template
meta_description: Template for performing named entity recognition on text with Label Studio for your machine learning and data science projects.
---

Named entity recognition for a piece of text. It supports overlapping spans and works with huge documents.

<img src="/images/screens/named_entity.png" class="img-template-example" title="Named Entity Recognition" />

## Config 

```html
<View>
  <Labels name="ner" toName="text">
    <Label value="Person"></Label>
    <Label value="Organization"></Label>
    <Label value="Fact"></Label>
    <Label value="Money"></Label>
    <Label value="Date"></Label>
    <Label value="Time"></Label>
    <Label value="Ordinal"></Label>
    <Label value="Percent"></Label>
    <Label value="Product"></Label>
    <Label value="Language"></Label>
    <Label value="Location"></Label>
  </Labels>
  <Text name="text" value="$text"></Text>
</View>
```

## Put labels on the left

```html
<View style="display: flex;">
  <View style="width: 250px; margin-right: 1em; padding: 1em; background: #343c7f;">
    <Labels name="ner" toName="text" showInline="false">
      <Label value="Person"></Label>
      <Label value="Organization"></Label>
      <Label value="Fact"></Label>
      <Label value="Money"></Label>
      <Label value="Date"></Label>
      <Label value="Time"></Label>
      <Label value="Ordinal"></Label>
      <Label value="Percent"></Label>
      <Label value="Product"></Label>
      <Label value="Language"></Label>
      <Label value="Location"></Label>
    </Labels>
  </View>
  <View>
    <Text name="text" value="$text"></Text>
  </View>
</View>
```

## Labeling Configuration

```html
<View>
  <Labels name="label" toName="text">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>

  <Text name="text" value="$text"/>
</View>
```

## Related tags

- [Labels](/tags/labels.html)
- [Text](/tags/text.html)