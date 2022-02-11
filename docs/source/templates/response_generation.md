---
title: Response Generation
type: templates
category: Conversational AI
cat: conversational-ai
order: 401
meta_title: Response Generation Data Labeling Template
meta_description: Template for generating responses in natural language understanding use cases with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/response-generation.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to train a machine learning model to generate a response for a chatbot or other conversational AI use case, use this template to provide a section of dialogue and type a response to create a training dataset.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>  
    <!--Use the Paragraphs object tag to display dialogue to annotators-->
  <Paragraphs name="chat" value="$dialogue" layout="dialogue" />
    <!--Use the Header tag to provide instructions to annotators-->
  <Header value="Provide response" />
    <!--Use the TextArea control tag to prompt annotators to provide a response
    to the sample of chat dialogue and allow them to edit their response but only 
    submit one response.-->
  <TextArea name="response" toName="chat" rows="4" editable="true" maxSubmissions="1" />
</View>
```

## Related tags

- [Paragraphs](/tags/paragraphs.html)
- [Header](/tags/header.html)
- [TextArea](/tags/textarea.html)