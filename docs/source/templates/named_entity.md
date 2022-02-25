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

## Interactive Template Preview

<div id="main-preview"></div>

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


## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the Labels control tag to specify the relevant NER labels to apply to various text spans:
```xml
<Labels name="label" toName="text">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
</Labels>
```
Use the `background` parameter with the Label control tag to specify a CSS color for the label.

Use the Text object tag to specify the text data:
```xml
<Text name="text" value="$text"/>
```

## Enhance this template

You can enhance this template in many ways. 

### Display labels on the left

If you want to modify the appearance of the labeling interface, you can use styling on the [View](/tags/view.html) tag. In this example, display the NER labels to the left of the text to be labeled.

Start by setting the entire labeling interface display to flex:
```xml
<View style="display: flex;">
```

Then use a different [View](/tags/view.html) tag to wrap the labels. Because the labels are listed before the text, they appear
    on the left side of the interface.
```xml
<View style="width: 250px; margin-right: 1em; padding: 1em; background: #343c7f;">
```
The styling on this tag sets a width for the section of the interface with the labels, adds a right margin between the labels and the text, adds padding around the labels, and a background color for this section of the interface.

Then you can add the [Labels](/tags/labels.html) control tag like usual to display the NER labels:
```xml
  <Labels name="label" toName="text" showInline="false">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>
```
Close the [View](/tags/view.html) tag with the Labels, and open a new one for the Text tag:
```xml
</View>
<View>
```

The [Text](/tags/text.html) object tag specifies the text to label:
```xml
<Text name="text" value="$text"></Text>
```

Then you can close the two remaining View tags.

## Related tags

- [View](/tags/view.html)
- [Labels](/tags/labels.html)
- [Text](/tags/text.html)