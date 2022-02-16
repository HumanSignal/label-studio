---
title: Named Entity Recognition
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 203
meta_title: Text Named Entity Recognition Data Labeling Template
meta_description: Template for performing named entity recognition on text with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/named-entity-recognition.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to perform named entity recognition (NER) on a sample of text, use this template. This template supports overlapping text spans and very large documents.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Labels control tag to specify the relevant NER
    labels to apply to various text spans-->
  <Labels name="label" toName="text">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>
<!--Use the Text object tag to specify the text data-->
  <Text name="text" value="$text"/>
</View>
```



## Put labels on the left

If you want to modify the appearance of the labeling interface, you can use styling on the [View](/tags/view.html) tag. 

```html

<View style="display: flex;">
    <!--Add styling to the View tag to set a width and background color
    for the section of the interface with the Labels, add a right margin, and padding 
    around the labels. Because the labels are listed before the text, they appear
    on the left side of the interface.-->
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
      <!--In an unstyled View, the Text object tag specifies the text to label-->
    <Text name="text" value="$text"></Text>
  </View>
</View>
```


## Related tags

- [View](/tags/view.html)
- [Labels](/tags/labels.html)
- [Text](/tags/text.html)