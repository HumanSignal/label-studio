---
title: Pairwise Comparison
type: templates
order: 10001
meta_title: Pairwise Comparison Data Labeling Template
meta_description: Label Studio Pairwise Comparison Template for machine learning and data science data labeling projects.
---

Pairwise comparison of different objects

## Run

```bash
label-studio init --template=pairwise pairwise_project
label-studio start pairwise_project
```

## Config

```html
<View>
  <Pairwise name="pw" toName="txt-1,txt-2" />
  <Text name="txt-1" value="$text1" />
  <Text name="txt-2" value="$text2" />
</View>
```
