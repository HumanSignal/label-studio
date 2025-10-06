### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Markdown text content, either static text or field name in task data (e.g., $markdown_field) |
| [style] | <code>string</code> | CSS style string |
| [className] | <code>string</code> | Class name of the CSS style to apply |
| [idAttr] | <code>string</code> | Unique ID attribute to use in CSS |
| [visibleWhen] | <code>region-selected</code> \| <code>choice-selected</code> \| <code>no-region-selected</code> \| <code>choice-unselected</code> | Control visibility of the content |
| [whenTagName] | <code>string</code> | Use with `visibleWhen`. Narrow down visibility by tag name |
| [whenLabelValue] | <code>string</code> | Use with `visibleWhen="region-selected"`. Narrow down visibility by label value |
| [whenChoiceValue] | <code>string</code> | Use with `visibleWhen` and `whenTagName`. Narrow down visibility by choice value |

