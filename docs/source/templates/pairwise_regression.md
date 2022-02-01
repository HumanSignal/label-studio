---
title: Pairwise Regression
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 501
meta_title: Pairwise Regression Data Labeling Template
meta_description: Template for performing pairwise comparison tasks for regression models with Label Studio for your machine learning and data science projects.
---

If you need a dataset to train a pairwise regression model, use this template to rate pairs of images based on how similar they are. You can also customize this template to rate different properties of different types of data, such as rating whether the sentiment of two text excerpts of movie reviews is similar. 


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

## Related tags

- [Header](/tags/header.html)
- [Image](/tags/image.html)
- [Rating](/tags/rating.html)
