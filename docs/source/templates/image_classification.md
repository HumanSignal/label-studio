---
title: Image Classification
type: templates
order: 101
---

Image classification with checkboxes.

## Config 

```html
<View>
  <Image name="img" value="$image"></Image>
  <Choices name="tag" toName="img" choice="single-radio">
    <Choice value="Airbus"></Choice>
    <Choice value="Boeing" background="blue"></Choice>
  </Choices>
</View>
```
