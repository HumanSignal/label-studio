---
title: Content-based Image Retrieval
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 504
meta_title: Content-based Image Retrieval Data Labeling Template
meta_description: Template for labeling data for content-based image retrieval tasks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/content-based-image-search.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to train a machine learning model on content-based image retrieval computer vision tasks, use this template. This labeling configuration displays an image and prompts annotators to select a choice corresponding to one or more similar images.  

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--object tag to specify the location of the image to use for the query-->
  <Image name="query" value="$query_image" />
    <!--use a header to instruct annotators how to perform the task-->
  <Header value="Choose similar images:" />
    <!--use styling in the View tag to display multiple images in a grid-->
  <View style="display: grid; column-gap: 8px; grid-template: auto/1fr 1fr 1fr">
    <Image name="image1" value="$image1" />
    <Image name="image2" value="$image2" />
    <Image name="image3" value="$image3" />
  </View>
    <!--use the Choices control tag to display choices that apply to the original image, 
    require a response, and allow annotators to select multiple choices-->
  <Choices name="similar" toName="query" required="true" choice="multiple">
    <Choice value="One" />
    <Choice value="Two" />
    <Choice value="Three" />
  </Choices>
    <!--Use the Style tag to display the similar images and the choices in a form grid-->
  <Style>
    [dataneedsupdate]~div form {display: flex}
    [dataneedsupdate]~div form>* {flex-grow:1;margin-left:8px}
  </Style>
</View>
```

## Related tags

- [Image](/tags/image.html)
- [Header](/tags/header.html)
- [View](/tags/view.html)
- [Choices](/tags/choices.html)
- [Style](/tags/style.html)
