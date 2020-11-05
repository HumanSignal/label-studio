---
title: Pairwise Comparison
type: templates
order: 10001
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
