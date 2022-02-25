---
title: Coreference Resolution and Entity Linking
type: templates
category: Conversational AI
cat: conversational-ai
order: 403
meta_title: Coreference Entity Resolution and Linking Data Labeling Template
meta_description: Template for labeling text data with coreferences to perform entity resolution and entity linking with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/coreference-resolution-and-entity-linking.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to train a machine learning model to be capable of natural language understanding in the context of conversational AI, you will want to perform coreference resolution on a dataset.

Use this template to assign coreferences using relations to specific entities identified in a passage of text. You can add relations to any identified region spans in Label Studio.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Control tags specify the labels that you want to apply to text spans-->
  <Labels name="label" toName="text">
    <Label value="Noun" background="red"/>
    <Label value="Pronoun" background="darkorange"/>
  </Labels>
<!--the Text object tag specifies the value of the text data-->
  <Text name="text" value="$text"/>
</View>
```

You can apply relations to the labeled text spans using the labeling interface. See [Add relations between annotations](/guide/labeling.html#Add-relations-between-annotations).

## Related tags

- [Labels](/tags/labels.html)
- [Text](/tags/text.html)
- [Relations](/tags/relations.html)