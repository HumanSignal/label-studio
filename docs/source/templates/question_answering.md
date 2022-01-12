---
title: Question Answering
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 201
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
  <Header value="Please read the passage" />
  <Text name="text" value="$text" granularity="word"/>
  <Header value="Select a text span answering the following question:"/>
  <Text name="question" value="$question"/>

  <Labels name="answer" toName="text">
    <Label value="Answer" maxUsage="1" background="red"/>
  </Labels>

</View>
```