---
title: Question Answering
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 201
meta_title: Question Answering Data Labeling Template
meta_description: Template for identifying answers to questions in tasks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/question-answering.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to train a question answering machine learning model, use this template to develop a dataset. This template prompts annotators to read a passage of text, then highlight the span of text that answers a specific question. 

## Interactive Template Preview

<div id="main-preview"></div>

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

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Please read the passage" />
```

Use the [Text](/tags/text.html) object tag to display a passage of text to the annotator:
```xml
<Text name="text" value="$text" granularity="word"/>
```
Use the `granularity` parameter to ensure that highlighted text spans include complete words.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Select a text span answering the following question:"/>
```

Use another [Text](/tags/text.html) object tag to display a second text snippet, in this case, a question about the text, to the annotator:
```xml
<Text name="question" value="$question"/>
```
The `name` parameter must be different from the `name` used for the first text snippet, and the `value` is used to reference a column in a CSV file or a key in a JSON file with the text to display. You can also display static text with the `value` argument.

Use the [Labels](/tags/labels.html) control tag to provide an Answer label for the annotator to use to highlight the answer to the question in the original text passage:
```xml
<Labels name="answer" toName="text">
    <Label value="Answer" maxUsage="1" background="red"/>
</Labels>
```

## Related tags

- [Text](/tags/text.html)
- [Labels](/tags/labels.html)
