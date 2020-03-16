---
title: Rating
type: tags
order: 409
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

### Example  
```html
<View>
  <Text name="txt" value="$text" />
  <Rating name="rating" toName="txt" maxRating="10" icon="star" size="medium" />
</View>
```
