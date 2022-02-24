---
title: Website Rating
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 505
meta_title: Website Rating Data Labeling Template
meta_description: Template for rating website content with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates-misc/website-rating.png" alt="" class="gif-border" width="552px" height="408px" />

For cases when you want to rate the quality of websites, or rate the trustworthiness and classify the content of a website, you can use this template.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <HyperText name="website" value="$website" inline="true"/>

  <Header value="Rate this website"/>
  <Rating name="rating" toName="website" maxRating="10" icon="star" size="medium" />

  <Choices name="choices" choice="single-radio" toName="website" showInline="true">
    <Choice value="Important article"/>
    <Choice value="Yellow press"/>
  </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

The [HyperText](/tags/hypertext.html) object tag specifies the location of the website to be labeled, and specifies to display it inline on the labeling interface:
```xml
<HyperText name="website" value="$website" inline="true"/>
```

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Rate this website"/>
```

The [Rating](/tags/rating.html) control tag provides a star rating out of 10 stars to annotators to use to rate the website content:
```xml
<Rating name="rating" toName="website" maxRating="10" icon="star" size="medium" />
```

The [Choices](/tags/choices.html) control tag lets annotators classify the website content as well:
```xml
  <Choices name="choices" choice="single-radio" toName="website" showInline="true">
    <Choice value="Important article"/>
    <Choice value="Yellow press"/>
  </Choices>
```

## Related tags
- [HyperText](/tags/hypertext.html)
- [Rating](/tags/rating.html)
- [Choices](/tags/choices.html)

## Related templates
- [HTML Classification](html_classification.html)