---
title: Pairwise Classification
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 503
meta_title: Pairwise Comparison Data Labeling Template
meta_description: Label Studio Pairwise Comparison Template for machine learning and data science data labeling projects.
---

Pairwise comparison of different objects

## Config

```html
<View>
  <Pairwise name="pw" toName="txt-1,txt-2" />
  <Text name="txt-1" value="$text1" />
  <Text name="txt-2" value="$text2" />
</View>
```

## Labeling Configuration

```html
<View>
  <Header>Select one of two items</Header>
  <Pairwise name="pw" toName="text1,text2" />
  <Text name="text1" value="$text1" />
  <Text name="text2" value="$text2" />
</View>
```