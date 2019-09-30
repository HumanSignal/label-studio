---
title: Sentiment Analysis
type: templates
order: 207
---

Classify sentiment of reviews for musical instruments found on Amazon

<img src="/images/screens/text_classification.png" class="img-template-example" title="Sentiment Analysis" />

## Run

```bash
python server.py -c config.json -l ../examples/sentiment_analysis/config.xml -i ../examples/sentiment_analysis/tasks.json -o output
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
