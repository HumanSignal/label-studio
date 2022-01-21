---
title: Sentiment Analysis Text Classification
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 202
meta_title: Sentiment Analysis Data Labeling Template
meta_description: Template for classifying the sentiment of text with Label Studio for your machine learning and data science projects.
---

Classify the sentiment of reviews, for example for musical instruments found on an online retailer.

## Labeling Configuration 

```html
<View>
  <Header value="Choose text sentiment:"/>
  <Text name="my_text" value="$reviewText"/>
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
