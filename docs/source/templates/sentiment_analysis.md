---
title: Text Sentiment Analysis
type: templates
order: 202
meta_title: Sentiment Analysis Data Labeling Template
meta_description: Label Studio Sentiment Analysis Template for machine learning and data science data labeling projects.
---

Classify sentiment of reviews for musical instruments found on Amazon

<img src="/images/screens/text_classification.png" class="img-template-example" title="Sentiment Analysis" />

## Run

```bash
label-studio init --template=text_sentiment sentiment_analysis_project
label-studio start sentiment_analysis_project 
```

## Config 

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
