---
title: Question Answering
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 201
meta_title: Question Answering Data Labeling Template
meta_description: Template for identifying answers to questions in tasks with Label Studio for your machine learning and data science projects.
---

If you want to train a question answering machine learning model, use this template to develop a dataset. This template prompts annotators to read a passage of text, then highlight the span of text that answers a specific question. 

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

## Related tags

- [Text](/tags/text.html)
- [Labels](/tags/labels.html)
