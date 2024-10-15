---
title: DateTime
type: tags
order: 405
---

The DateTime tag adds date and time selection to the labeling interface. Use this tag to add a date, timestamp, month, or year to an annotation.

Use with the following data types: audio, image, HTML, paragraph, text, time series, video

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to label |
| only | <code>string</code> |  | Comma-separated list of parts to display (date, time, month, year)        date and month/year can't be used together. The date option takes precedence |
| format | <code>string</code> |  | Input/output strftime format for datetime (internally it's always ISO);        when both date and time are displayed, by default shows ISO with a "T" separator;        when only date is displayed, by default shows ISO date;        when only time is displayed, by default shows a 24 hour time with leading zero |
| [min] | <code>string</code> |  | Set a minimum datetime value for only=date in ISO format, or minimum year for only=year |
| [max] | <code>string</code> |  | Set a maximum datetime value for only=date in ISO format, or maximum year for only=year |
| [required] | <code>boolean</code> | <code>false</code> | Whether datetime is required or not |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |
| [perRegion] | <code>boolean</code> |  | Use this option to label regions instead of the whole object |
| [perItem] | <code>boolean</code> |  | Use this option to label items inside the object instead of the whole object |

### Example
```html
<View>
  <Text name="txt" value="$text" />
  <DateTime name="datetime" toName="txt" only="date" />
</View>
```
