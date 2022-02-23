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

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>  
  <Paragraphs name="chat" value="$dialogue" layout="dialogue" />
  <Header value="Provide response" />
  <TextArea name="response" toName="chat" rows="4" editable="true" maxSubmissions="1" />
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Paragraphs](/tags/paragraphs.html) object tag to display dialogue to annotators:
```xml
<Paragraphs name="chat" value="$dialogue" layout="dialogue" />
```

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Provide response" />
```

Use the [TextArea](/tags/textarea.html) control tag to provide a spot for annotators to provide a response to the sample of chat dialogue: 
```xml
<TextArea name="response" toName="chat" rows="4" editable="true" maxSubmissions="1" />
```
The `editable="true"` parameter allows annotators to edit their response, but `maxSubmissions="1"` ensures that annotators provide only one response.

## Related tags

- [Paragraphs](/tags/paragraphs.html)
- [Header](/tags/header.html)
- [TextArea](/tags/textarea.html)
