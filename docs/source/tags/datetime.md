---
title: DateTime
type: tags
order: 404
is_new: t
---

DateTime adds date and time selection

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to label |
| only | <code>string</code> |  | Comma-separated list of parts to display (date, time) |
| [min] | <code>string</code> |  | Minimum datetime value |
| [max] | <code>string</code> |  | Maximum datetime value |
| [required] | <code>boolean</code> | <code>false</code> | Whether datetime is required or not |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |
| [perRegion] | <code>boolean</code> |  | Use this tag to label regions instead of the whole object |

### Example
```html
<View>
  <Text name="txt" value="$text" />
  <DateTime name="datetime" toName="txt" only="date" />
</View>
```
