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

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration 

```html
<View>
    <!--Use the Header tag to provide instructions to annotators-->
  <Header value="Choose text sentiment:"/>
    <!--Use the Text object tag to display the text to be classified-->
  <Text name="my_text" value="$reviewText"/>
    <!--Use the Choices control tag to provide the classification options to annotators,
    allow them to only select one option, and display the choices in a row.-->
  <Choices name="sentiment" toName="my_text" choice="single" showInLine="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
  </Choices>
</View>
```

## Related tags
- [Text](/tags/text.html)
- [Choices](/tags/choices.html)
