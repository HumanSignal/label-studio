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

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Header>Select one of two items</Header>
  <Pairwise name="pw" toName="text1,text2" />
  <Text name="text1" value="$text1" />
  <Text name="text2" value="$text2" />
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header>Select one of two items</Header>
```

Use the [Pairwise](/tags/pairwise.html) control tag to apply pairwise selections to two samples of text:
```xml
<Pairwise name="pw" toName="text1,text2" />
```

Use the [Text](/tags/text.html) object tag to specify two samples of text with distinct names:
```xml
<Text name="text1" value="$text1" />
<Text name="text2" value="$text2" />
```

## Related tags
- [Header](/tags/header.html)
- [Pairwise](/tags/pairwise.html)
- [Text](/tags/text.html)

