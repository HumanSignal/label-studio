---
title: Rating
type: tags
order: 419
meta_title: Rating Tags for Ratings
meta_description: Label Studio Rating Tags customize Label Studio for ratings for machine learning and data science projects.
---

Rating adds rating selection

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
| [perRegion] | <code>boolean</code> |  | Use this tag to label regions instead of the whole object |

### Example
```html
<View>
  <Text name="txt" value="$text" />
  <Rating name="rating" toName="txt" maxRating="10" icon="star" size="medium" />
</View>
```
