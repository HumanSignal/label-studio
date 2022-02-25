---
title: Relation Extraction
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 205
meta_title: Relation Extraction Data Labeling Template
meta_description: Template for extracting relations in natural language processing text tasks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/relation-extraction.png" alt="" class="gif-border" width="552px" height="408px" />

If you need to train a natural language processing model to perform relationship extraction tasks, use this template to create a dataset. This template prompts an annotator to label text spans and identify relationships between the spans. For example, identifying people and organizations, and adding relation arrows and labels to identify who founded an organization.

<!--Intentionally removing interactive template because the relations option isn't visible in the preview-->

## Labeling Configuration

```html
<View>
   <Relations>
    <Relation value="org:founded_by"/>
    <Relation value="org:founded"/>
  </Relations>
  <Labels name="label" toName="text">
    <Label value="Organization" background="orange"/>
    <Label value="Person" background="green"/>
    <Label value="Datetime" background="blue"/>
  </Labels>
  <Text name="text" value="$text"/>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Relations](/tags/relations.html) control tag to provide labels that can be applied to relations added between text spans:
```xml
<Relations>
    <Relation value="org:founded_by"/>
    <Relation value="org:founded"/>
</Relations>
```

Use the [Labels](/tags/labels.html) control tag to specify labels to apply to spans of text:
```xml
<Labels name="label" toName="text">
    <Label value="Organization" background="orange"/>
    <Label value="Person" background="green"/>
    <Label value="Datetime" background="blue"/>
</Labels>
```

Use the [Text](/tags/text.html) object tag to display the text on the labeling interface:
```xml
<Text name="text" value="$text"/>
```

## Related tags

- [Relations](/tags/relations.html)
- [Labels](/tags/labels.html)
- [Text](/tags/text.html)

## Related templates

- [Coreference Resolution and Entity Linking](coreference_entity_linking.html)
