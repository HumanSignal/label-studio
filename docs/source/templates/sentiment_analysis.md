---
title: Sentiment Analysis
type: templates
order: 207
---

Classify sentiment of reviews for musical instruments found on Amazon

![Sentiment Analysis UI](https://user.fm/files/v2-c739eea809a0fde9c90675a2396f577e/Screen%20Shot%202019-08-01%20at%209.17.04%20PM.png "Sentiment Analysis UI")

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
