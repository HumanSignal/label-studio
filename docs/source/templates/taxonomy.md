---
title: Taxonomy
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 204
meta_title: Taxonomy Data Labeling Template
meta_description: Template for classifying a taxonomy or hierarchy with Label Studio for your machine learning and data science projects.
---

Perform classification tasks within the context of a defined taxonomy or hierarchy of choices. 

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

## Related tags

- [Text](/tags/text.html)
- [Taxonomy](/tags/taxonomy.html)
- [Choice](/tags/choice.html)