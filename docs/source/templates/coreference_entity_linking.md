---
title: Coreference Resolution and Entity Linking
type: templates
category: Conversational AI
cat: conversational-ai
order: 403
meta_title: Coreference Entity Resolution and Linking Data Labeling Template
meta_description: Template for labeling text data with coreferences to perform entity resolution and entity linking with Label Studio for your machine learning and data science projects.
---

If you want to train a machine learning model to be capable of natural language understanding in the context of conversational AI, you will want to perform coreference resolution on a dataset.

Use this template to assign coreferences using relations to specific entities identified in a passage of text. You can add relations to any identified region spans in Label Studio.

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

## Related tags

- [Labels](/tags/labels.html)
- [Text](/tags/text.html)
- [Relations](/tags/relations.html)