---
title: Text Summarization
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 206
meta_title: Text Summarization Data Labeling Template
meta_description: Template for summarizing text with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/text-summarization.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to build a machine learning model to summarize text, use this template to create a dataset of one sentence summaries of text samples. You can also customize this template to ask for different types or lengths of summaries. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Header tag to provide instructions to annotators-->
  <Header value="Please read the text" />
    <!--Use the Text object tag to display text-->
  <Text name="text" value="$text" />

  <Header value="Provide one sentence summary" />
    <!--Use the TextArea control tag to provide a text box with a 
    submit button that annotators must type a summary into and can 
    edit their responses.-->
  <TextArea name="answer" toName="text"
            showSubmitButton="true" maxSubmissions="1" editable="true"
            required="true" />
</View>
```

## Related tags

- [Header](/tags/header.html)
- [Text](/tags/text.html)
- [TextArea](/tags/textarea.html)
