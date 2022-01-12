---
title: Response Generation
type: templates
category: Conversational AI
cat: conversational-ai
order: 401
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>  
  <Paragraphs name="chat" value="$dialogue" layout="dialogue" />
  <Header value="Provide response" />
  <TextArea name="response" toName="chat" rows="4" editable="true" maxSubmissions="1" />
</View>
```
