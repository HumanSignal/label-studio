---
title: HTML Entity Recognition
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 604
meta_title: HTML Entity Resolution Data Labeling Template
meta_description: Template for performing HTML document entity resolution with Label Studio for your machine learning and data science projects.
---

<br/><img src="/images/templates/html-entity-recognition.png" alt="" class="gif-border" width="552px" height="408px" />

Perform named entity recognition for HTML documents. Use this template to display text with HTML markup and label spans.

<!--Removing interactive template because it doesn't work due to the outdated version of LSF in playground-->

## Labeling Configuration 

```html
<View>
    <!--Use the Labels control tag to specify the entities-->
  <Labels name="ner" toName="text">
    <Label value="Person"></Label>
    <Label value="Organization"></Label>
  </Labels>
    <!--Use the HyperText object tag to display the text containing HTML markup-->
  <HyperText name="text" value="$text"></HyperText>
</View>
```
## Related tags

- [Labels](/tags/labels.html)
- [HyperText](/tags/hypertext.html)