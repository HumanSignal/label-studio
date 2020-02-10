---
title: Text Sentiment Analysis
type: templates
order: 202
---

Classify sentiment of reviews for musical instruments found on Amazon

<img src="/images/screens/text_classification.png" class="img-template-example" title="Sentiment Analysis" />

## Run

```bash
label-studio init --template=sentiment_analysis sentiment_analysis_project
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
