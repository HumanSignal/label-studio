---
title: Content-based Image Retrieval
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 504
meta_title: Content-based Image Retrieval Data Labeling Template
meta_description: Template for labeling data for content-based image retrieval tasks with Label Studio for your machine learning and data science projects.
---

If you want to train a machine learning model on content-based image retrieval computer vision tasks, use this template. This labeling configuration displays an image and prompts annotators to select a choice corresponding to one or more similar images.  


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

## Related tags

- [Image](/tags/image.html)
- [Choices](/tags/choices.html)
- [Style](/tags/style.html)
