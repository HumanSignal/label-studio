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

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Image name="query" value="$query_image" />
  <Header value="Choose similar images:" />
  <View style="display: grid; column-gap: 8px; grid-template: auto/1fr 1fr 1fr">
    <Image name="image1" value="$image1" />
    <Image name="image2" value="$image2" />
    <Image name="image3" value="$image3" />
  </View>
  <Choices name="similar" toName="query" required="true" choice="multiple">
    <Choice value="One" />
    <Choice value="Two" />
    <Choice value="Three" />
  </Choices>
  <Style>
    [dataneedsupdate]~div form {display: flex}
    [dataneedsupdate]~div form>* {flex-grow:1;margin-left:8px}
  </Style>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use an [Image](/tags/image.html) object tag to specify the location of the image to use for the query:
```xml
<Image name="query" value="$query_image" />
```

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Choose similar images:" />
```

Use styling in the [View](/tags/view.html) tag to wrap multiple [Image](/tags/image.html) object tags to display multiple images in a grid:
```xml
  <View style="display: grid; column-gap: 8px; grid-template: auto/1fr 1fr 1fr">
    <Image name="image1" value="$image1" />
    <Image name="image2" value="$image2" />
    <Image name="image3" value="$image3" />
  </View>
```
  
Use the [Choices](/tags/choices.html) control tag to display choices that apply to the original image, require a response, and allow annotators to select multiple choices:
```xml
<Choices name="similar" toName="query" required="true" choice="multiple">
    <Choice value="One" />
    <Choice value="Two" />
    <Choice value="Three" />
</Choices>
```

Use the [Style](/tags/style.html) tag to apply additional CSS styles to the div form classes used on the labeling interface to further enhance the grid:
```xml
<Style>
    [dataneedsupdate]~div form {display: flex}
    [dataneedsupdate]~div form>* {flex-grow:1;margin-left:8px}
</Style>
```
The `[dataneedsupdate]` option associates the styling with the object tags used in the labeling configuration.
  

## Related tags

- [Image](/tags/image.html)
- [Header](/tags/header.html)
- [View](/tags/view.html)
- [Choices](/tags/choices.html)
- [Style](/tags/style.html)
