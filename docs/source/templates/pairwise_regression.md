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

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Header to provide instructions to annotators-->
  <Header>Set how likely these images represent the same thing:</Header>
    <!--Add styling to the View tag to control how the image data is displayed-->
    <View style="display: grid; column-gap: 8px; grid-template: auto/1fr 1fr">
        <!--Use the Image object tag to specify two images on the labeling interface-->
  	<Image name="image1" value="$image1" />
    <Image name="image2" value="$image2" />
  </View>
    <!--Add styling to the View tag to control how the rating option is displayed-->
  <View style="margin-left: auto; margin-right: auto; width: 16em">
      <!--Use the Rating control tag to display star ratings to apply to both images-->
    <Rating name="rating" toName="image1,image2"/>
    </View>
</View>
```

## Related tags

- [Header](/tags/header.html)
- [View](/tags/view.html)
- [Image](/tags/image.html)
- [Rating](/tags/rating.html)
