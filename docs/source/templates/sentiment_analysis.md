---
title: Sentiment Analysis Text Classification
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 202
meta_title: Sentiment Analysis Data Labeling Template
meta_description: Template for classifying the sentiment of text with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/text-classification.png" alt="" class="gif-border" width="552px" height="408px" />

Classify the sentiment of text using this template. For example, if you want to classify the sentiment of reviews of musical instruments for sale on an online retailer.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration 

```html
<View>
  <Header value="Choose text sentiment:"/>
  <Text name="my_text" value="$reviewText"/>
  <Choices name="sentiment" toName="my_text" choice="single" showInline="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
  </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Choose text sentiment:"/>
```

Use the [Text](/tags/text.html) object tag to display the text to be classified:
```xml
<Text name="my_text" value="$reviewText"/>
```

Use the [Choices](/tags/choices.html) control tag to provide the classification options to annotators, allow them to only select one option, and display the choices in one line:
```xml
<Choices name="sentiment" toName="my_text" choice="single" showInline="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
</Choices>
```

## Related tags
- [Text](/tags/text.html)
- [Choices](/tags/choices.html)
