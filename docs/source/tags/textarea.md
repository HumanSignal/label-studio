---
title: TextArea
type: tags
order: 426
meta_title: Textarea Tags for Text areas
meta_description: Label Studio Textarea Tags customize Label Studio for text areas and transcriptions for machine learning and data science projects.
---

TextArea tag shows the textarea for user input

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to label |
| value | <code>string</code> |  | Pre-filled value |
| [label] | <code>string</code> |  | Label text |
| [placeholder] | <code>string</code> |  | Placeholder text |
| [maxSubmissions] | <code>string</code> |  | Maximum number of submissions |
| [editable] | <code>boolean</code> | <code>false</code> | Editable textarea results |
| [transcription] | <code>boolean</code> | <code>false</code> | If false, always show editor |
| [rows] | <code>number</code> |  | Number of rows in the textarea |
| [required] | <code>boolean</code> | <code>false</code> | Validate whether content in textarea is required |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |
| [showSubmitButton] | <code>boolean</code> |  | Whether to show or hide the submit button. By default it shows when there are more than one rows of text, such as in textarea mode. |
| [perRegion] | <code>boolean</code> |  | Use this tag to label regions instead of whole objects |

### Example
```html
<View>
  <TextArea name="ta"></TextArea>
</View>
```
