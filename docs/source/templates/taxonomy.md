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

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Text object tag to display text-->
  <Text name="text" value="$text"/>
    <!--Use the Taxonomy control tag to create a taxonomy
    of choices for annotators to select-->
  <Taxonomy name="taxonomy" toName="text">
      <!--Use the Choice control tag to specify the options
      of the specific taxonomy-->
    <Choice value="Archaea" />
    <Choice value="Bacteria" />
      <!--Nest choices under a specific Choice to create
      layers in the taxonomy-->
    <Choice value="Eukarya">
      <Choice value="Human" />
      <Choice value="Oppossum" />
      <Choice value="Extraterrestial" />
    </Choice>
  </Taxonomy>
</View>
```

## Related tags

- [Text](/tags/text.html)
- [Taxonomy](/tags/taxonomy.html)
- [Choice](/tags/choice.html)