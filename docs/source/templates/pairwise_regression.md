---
title: Pairwise Regression
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 501
meta_title: Pairwise Regression Data Labeling Template
meta_description: Template for performing pairwise comparison tasks for regression models with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/pairwise-regression.png" alt="" class="gif-border" width="552px" height="408px" />

If you need a dataset to train a pairwise regression model, use this template to rate pairs of images based on how similar they are. You can also customize this template to rate different properties of different types of data, such as rating whether the sentiment of two text excerpts of movie reviews is similar. 

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Header>Set how likely these images represent the same thing:</Header>
  <View style="display: grid; column-gap: 8px; grid-template: auto/1fr 1fr">
  	<Image name="image1" value="$image1" />
    <Image name="image2" value="$image2" />
  </View>
  <View style="margin-left: auto; margin-right: auto; width: 16em">
    <Rating name="rating" toName="image1,image2"/>
  </View>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header>Set how likely these images represent the same thing:</Header>
```

Add styling to a [View](/tags/view.html) tag that wraps the Image tags to control how the image data is displayed:
```xml
<View style="display: grid; column-gap: 8px; grid-template: auto/1fr 1fr">
```
This styling displays the enclosed items in a grid with a gap of 8 pixels between columns.

Use the [Image](/tags/image.html) object tag to specify two images on the labeling interface:
```xml
<Image name="image1" value="$image1" />
<Image name="image2" value="$image2" />
```
Close the [View](/tags/view.html) tag after the Image tags. 

Add a new [View](/tags/view.html) tag with styling to control how the rating option is displayed on the labeling interface:
```xml
<View style="margin-left: auto; margin-right: auto; width: 16em">
```

Use the [Rating](/tags/rating.html) control tag to display star ratings to apply to both images:
```xml
<Rating name="rating" toName="image1,image2"/>
```
Close the [View](/tags/view.html) tag after the Rating tag.

## Related tags

- [Header](/tags/header.html)
- [View](/tags/view.html)
- [Image](/tags/image.html)
- [Rating](/tags/rating.html)
