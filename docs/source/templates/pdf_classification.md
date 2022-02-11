---
title: PDF Classification
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 602
meta_title: PDF Classification Data Labeling Template
meta_description: Template for classifying PDF data with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/pdf-classification.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to perform PDF classification, use this template. This template prompts an annotator to rate a PDF on a 10-star scale, then categorize it.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Header tag to provide instructions to annotators-->
    <Header value="Rate this article"/>
    <!--Use the Rating control tag to apply a star rating with a scale of 10 to the pdf-->
  <Rating name="rating" toName="pdf" maxRating="10" icon="star" size="medium" />
<!--Use the Choices control tag to present classification options to the annotator-->
  <Choices name="choices" choice="single-radio" toName="pdf" showInline="true">
    <Choice value="Important article"/>
    <Choice value="Yellow press"/>
  </Choices>
    <!--Use the HyperText tag to render an inline version of the PDF data-->
  <HyperText name="pdf" value="$pdf" inline="true"/>
</View>
```

### Input data

Label Studio does not support labeling PDF-formatted files directly. Instead, convert your PDF to HTML or an image file. See [importing tasks](/guide/tasks.html) for more.  

## Related tags
- [Rating](/tags/rating.html)
- [Choices](/tags/choices.html)
- [HyperText](/tags/hypertext.html)
