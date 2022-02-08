---
title: Text Summarization
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 206
meta_title: Text Summarization Data Labeling Template
meta_description: Template for summarizing text with Label Studio for your machine learning and data science projects.
---

If you want to build a machine learning model to summarize text, use this template to create a dataset of one sentence summaries of text samples. You can also customize this template to ask for different types or lengths of summaries. 

## Labeling Configuration

```html
<View>
  <Header value="Please read the text" />
  <Text name="text" value="$text" />

  <Header value="Provide one sentence summary" />
  <TextArea name="answer" toName="text"
            showSubmitButton="true" maxSubmissions="1" editable="true"
            required="true" />
</View>
```

## Related tags

- [Header](/tags/header.html)
- [Text](/tags/text.html)
- [TextArea](/tags/textarea.html)
