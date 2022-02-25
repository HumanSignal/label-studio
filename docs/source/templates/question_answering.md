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

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Header tag to provide instructions to the annotator-->
  <Header value="Please read the passage" />
    <!--Use the Text object tag to display a passage of text to the annotator.
    Use the granularity argument to ensure that highlighted text spans include 
    complete words.-->
  <Text name="text" value="$text" granularity="word"/>
  <Header value="Select a text span answering the following question:"/>
    <!--Use another Text object tag to display a second text snippet, in this 
    case a question about the text, to the annotator.-->
  <Text name="question" value="$question"/>
<!--Use the Labels control tag to provide an Answer label for the annotator
to use to highlight the answer to the question in the original text passage.-->
  <Labels name="answer" toName="text">
    <Label value="Answer" maxUsage="1" background="red"/>
  </Labels>

</View>
```

## Related tags

- [Text](/tags/text.html)
- [Labels](/tags/labels.html)
