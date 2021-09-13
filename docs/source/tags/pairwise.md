---
title: Pairwise
type: tags
order: 413
meta_title: Pairwise Tag to Compare Objects
meta_description: Customize Label Studio with the Pairwise tag for object comparison tasks for machine learning and data science projects.
---

Use the Pairwise tag to compare two different objects.

Use with the following data types: audio, image, HTML, paragraphs, text, time series, video

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the element |
| toName | <code>string</code> | Comma-separated names of the elements you want to compare |
| [selectionStyle] | <code>string</code> | Style for the selection |

### Example
```html
<!--Basic labeling configuration to compare two passages of text -->
<View>
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
