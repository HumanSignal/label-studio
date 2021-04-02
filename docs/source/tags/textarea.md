---
title: TextArea
type: tags
order: 424
meta_title: Textarea Tags for Text areas
meta_description: Label Studio Textarea Tags customize Label Studio for text areas and transcriptions for machine learning and data science projects.
---

TextArea tag shows the textarea for user input

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the element that you want to label if any |
| value | <code>string</code> |  |  |
| [label] | <code>string</code> |  | label text |
| [placeholder] | <code>string</code> |  | placeholder text |
| [maxSubmissions] | <code>string</code> |  | maximum number of submissions |
| [editable] | <code>boolean</code> | <code>false</code> | editable textarea results |
| [transcription] | <code>boolean</code> | <code>false</code> | always show editor |
| [rows] | <code>number</code> |  | number of rows in the textarea |
| [required] | <code>boolean</code> | <code>false</code> | validation if textarea is required |
| [requiredMessage] | <code>string</code> |  | message to show if validation fails |
| [showSubmitButton] | <code>boolean</code> |  | show submit button or hide it, it's shown by default when rows is more than one (i.e. textarea mode) |
| [perRegion] | <code>boolean</code> |  | use this tag for region labeling instead of the whole object labeling |

### Example
```html
<View>
  <TextArea name="ta"></TextArea>
</View>
```
