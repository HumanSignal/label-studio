---
title: PDF Classification
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 602
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
    <Header value="Rate this article"/>
  <Rating name="rating" toName="pdf" maxRating="10" icon="star" size="medium" />

  <Choices name="choices" choice="single-radio" toName="pdf" showInline="true">
    <Choice value="Important article"/>
    <Choice value="Yellow press"/>
  </Choices>
  <HyperText name="pdf" value="$pdf" inline="true"/>
</View>
```