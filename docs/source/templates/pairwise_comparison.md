---
title: Pairwise Classification
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 503
meta_title: Pairwise Classification Data Labeling Template
meta_description: Template for performing pairwise classification and comparison tasks with Label Studio for your machine learning and data science projects.
---

Pairwise comparison of different objects.

## Labeling Configuration

```html
<View>
  <Header>Select one of two items</Header>
  <Pairwise name="pw" toName="text1,text2" />
  <Text name="text1" value="$text1" />
  <Text name="text2" value="$text2" />
</View>
```

## Related tags
- [Header](/tags/header.html)
- [Pairwise](/tags/pairwise.html)
- [Text](tags/text.html)

