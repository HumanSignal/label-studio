---
title: Rating
type: tags
order: 417
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
| [size] | <code>string</code> | <code>&quot;medium&quot;</code> | One of: small, medium, large |
| [icon] | <code>string</code> | <code>&quot;start&quot;</code> | One of: star, heart, fire, smile |
| hotkey | <code>string</code> |  | HotKey for changing rating value |
| [required] | <code>boolean</code> | <code>false</code> | validation if rating is required |
| [requiredMessage] | <code>string</code> |  | message to show if validation fails |
| [perRegion] | <code>boolean</code> |  | use this tag for region labeling instead of the whole object labeling |

### Example
```html
<View>
  <Text name="txt" value="$text" />
  <Rating name="rating" toName="txt" maxRating="10" icon="star" size="medium" />
</View>
```
