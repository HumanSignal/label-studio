---
title: Text Named Entity Recognition
type: templates
order: 201
meta_title: Text Named Entity Recognition Data Labeling Template
meta_description: Label Studio Text Named Entity Template for machine learning and data science data labeling projects.
---

Named entity recognition for a piece of text. It supports overlapping spans and works with huge documents.

<img src="/images/screens/named_entity.png" class="img-template-example" title="Named Entity Recognition" />

## Run

```bash
label-studio init --template=named_entity named_entity_project
label-studio start named_entity_project 
```

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
