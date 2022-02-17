---
title: Pairwise Classification
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 503
meta_title: Pairwise Classification Data Labeling Template
meta_description: Template for performing pairwise classification and comparison tasks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/pairwise-classification.png" alt="" class="gif-border" width="552px" height="408px" />

Perform pairwise classification and comparison of different objects with Label Studio using this template.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Header to provide instructions to annotators-->
  <Header>Select one of two items</Header>
    <!--Use the Pairwise control tag to apply pairwise selections
    to two samples of text.-->
  <Pairwise name="pw" toName="text1,text2" />
    <!--Use the Text object tag to specify two samples of text-->
  <Text name="text1" value="$text1" />
  <Text name="text2" value="$text2" />
</View>
```

## Related tags
- [Header](/tags/header.html)
- [Pairwise](/tags/pairwise.html)
- [Text](tags/text.html)

