---
title: Coreference Resolution and Entity Linking
type: templates
category: Conversational AI
cat: conversational-ai
order: 403
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
  <Labels name="label" toName="text">
    <Label value="Noun" background="red"/>
    <Label value="Pronoun" background="darkorange"/>
  </Labels>

  <Text name="text" value="$text"/>
</View>
```
