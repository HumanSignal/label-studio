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

## Interactive Template Preview

<div id="main-preview"></div>

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

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Labels](/tags/labels.html) control tag to specify the labels that you want to apply to text spans:
```xml
<Labels name="label" toName="text">
    <Label value="Noun" background="red"/>
    <Label value="Pronoun" background="darkorange"/>
</Labels>
```

The [Text](/tags/text.html) object tag specifies the value of the text data:
```xml
<Text name="text" value="$text"/>
```

To apply relations to the labeled text spans, use the labeling interface. See [Add relations between annotations](/guide/labeling.html#Add-relations-between-annotations). If you want to add labels to the relations themselves, use the [Relations](/tags/relations.html) tag. See the [Relation Extraction Template](relation_extraction.html) for more.

## Related tags

- [Labels](/tags/labels.html)
- [Text](/tags/text.html)
- [Relations](/tags/relations.html)
