---
title: Response Generation
type: templates
category: Conversational AI
cat: conversational-ai
order: 401
meta_title: Response Generation Data Labeling Template
meta_description: Template for generating responses in natural language understanding use cases with Label Studio for your machine learning and data science projects.
---

Create a dataset to train a machine learning model to generate a response for a chatbot or other conversational AI use case. 

Use this template to provide a section of dialogue and type a response. 

## Labeling Configuration

```html
<View>  
  <Paragraphs name="chat" value="$dialogue" layout="dialogue" />
  <Header value="Provide response" />
  <TextArea name="response" toName="chat" rows="4" editable="true" maxSubmissions="1" />
</View>
```

## Related tags

- [Paragraphs](/tags/paragraphs.html)
- [TextArea](/tags/textarea.html)