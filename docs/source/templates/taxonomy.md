---
title: Taxonomy
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 204
meta_title: Taxonomy Data Labeling Template
meta_description: Template for classifying a taxonomy or hierarchy with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/taxonomy.png" alt="" class="gif-border" width="552px" height="408px" />

Perform classification tasks within the context of a defined taxonomy or hierarchy of choices. 

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text">
    <Choice value="Archaea" />
    <Choice value="Bacteria" />
    <Choice value="Eukarya">
      <Choice value="Human" />
      <Choice value="Oppossum" />
      <Choice value="Extraterrestial" />
    </Choice>
  </Taxonomy>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Text](/tags/text.html) object tag to display text to classify:
```xml
<Text name="text" value="$text"/>
```
Use the [Taxonomy](/tags/taxonomy.html) control tag to create a taxonomy of choices for annotators to select from:
```xml
<Taxonomy name="taxonomy" toName="text">
```
Use the [Choice](/tags/choice.html) control tag within the Taxonomy tag to specify the options of the specific taxonomy:
```xml
    <Choice value="Archaea" />
    <Choice value="Bacteria" />
    <Choice value="Eukarya">
      <Choice value="Human" />
      <Choice value="Oppossum" />
      <Choice value="Extraterrestial" />
    </Choice>
```
Nest choices under a specific [Choice](/tags/choice.html) tag to create layers in the taxonomy.


## Related tags

- [Text](/tags/text.html)
- [Taxonomy](/tags/taxonomy.html)
- [Choice](/tags/choice.html)