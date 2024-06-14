---
title: Rating
type: tags
order: 420
meta_title: Rating Tag for Ratings
meta_description: Customize Label Studio to add ratings to tasks with the Rating tag in your machine learning and data science projects.
---

The `Rating` tag adds a rating selection to the labeling interface. Use for labeling tasks involving ratings.

Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to label |
| [maxRating] | <code>number</code> | <code>5</code> | Maximum rating value |
| [defaultValue] | <code>number</code> | <code>0</code> | Default rating value |
| [size] | <code>small</code> \| <code>medium</code> \| <code>large</code> | <code>medium</code> | Rating icon size |
| [icon] | <code>star</code> \| <code>heart</code> \| <code>fire</code> \| <code>smile</code> | <code>star</code> | Rating icon |
| hotkey | <code>string</code> |  | HotKey for changing rating value |
| [required] | <code>boolean</code> | <code>false</code> | Whether rating validation is required |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |
| [perRegion] | <code>boolean</code> |  | Use this tag to rate regions instead of the whole object |
| [perItem] | <code>boolean</code> |  | Use this tag to rate items inside the object instead of the whole object |

### Example

Basic labeling configuration to rate the content of a text passage

```html
<View>
  <Text name="txt" value="$text" />
  <Rating name="rating" toName="txt" maxRating="10" icon="star" size="medium" />
</View>
```
