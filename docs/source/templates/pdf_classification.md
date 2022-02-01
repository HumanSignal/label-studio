---
title: PDF Classification
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 602
meta_title: PDF Classification Data Labeling Template
meta_description: Template for classifying PDF data with Label Studio for your machine learning and data science projects.
---

If you want to perform PDF classification, use this template. This template prompts an annotator to rate a PDF on a 10-star scale, then categorize it.

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

### Input data

Label Studio does not support labeling PDF-formatted files directly. Instead, convert your PDF to HTML or an image file. See [importing tasks](/guide/tasks.html) for more.  

## Related tags
- [Rating](/tags/rating.html)
- [Choices](/tags/choices.html)
- [HyperText](/tags/hypertext.html)
