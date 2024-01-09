---
title: Pairwise
type: tags
order: 415
meta_title: Pairwise Tag to Compare Objects
meta_description: Customize Label Studio with the Pairwise tag for object comparison tasks for machine learning and data science projects.
---

The `Pairwise` tag is used to compare two different objects and select one item from the list. If you want annotators to compare two objects and determine whether they are similar or not, use the `Choices` tag.

Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the element |
| toName | <code>string</code> | Comma-separated names of the elements you want to compare |
| [selectionStyle] | <code>string</code> | Style for the selection |

### Example

Basic labeling configuration to compare two passages of text

```html
<View>
  <Header value="Select the more accurate summary"/>
  <Pairwise name="pairwise" leftClass="text1" rightClass="text2" toName="txt-1,txt-2"></Pairwise>
  <Text name="txt-1" value="Text 1" />
  <Text name="txt-2" value="Text 2" />
</View>
```
### Example

You can also style the appearance using the View tag:

```html
<View>
  <Pairwise name="pw" toName="txt-1,txt-2"></Pairwise>
  <View style="display: flex;">
    <View style="margin-right: 1em;"><Text name="txt-1" value="$text1" /></View>
    <View><Text name="txt-2" value="$text2" /></View>
  </View>
</View>
```
