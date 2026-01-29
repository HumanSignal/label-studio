### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name to identify the TextArea |
| toName | <code>string</code> |  | Name assigned to the object tag that the TextArea is labeling |
| [value] | <code>string</code> |  | A pre-filled default value that appears within the rendered TextArea field and can be submitted |
| [placeholder] | <code>string</code> |  | Placeholder text that appears inside the rendered TextArea field, but unlike `value` it cannot be submitted |
| [maxSubmissions] | <code>string</code> |  | Maximum number of submissions |
| [editable] | <code>boolean</code> | <code>false</code> | Whether to display an icon that allows the annotator to edit their text after adding it |
| [transcription] | <code>boolean</code> | <code>false</code> | When set to true and used with `editable="true"`, the TextArea UI will remain an editable field even after you add your text |
| [skipDuplicates] | <code>boolean</code> | <code>false</code> | When set to true, a pop-up warning will appear and prevent duplicate values. See [the example below](#Example-Enforce-unique-values) |
| [displayMode] | <code>tag</code> \| <code>region-list</code> | <code>tag</code> | Display mode for the TextArea; when set to `region-list` there will be an input field for every region in the Regions panel. See [the example below](#Example-Region-list-TextArea-fields) |
| [rows] | <code>number</code> | <code>1</code> | Number of rows in the TextArea input field. If `1`, you can submit text by pressing Enter. If greater than `1`, you can submit text by clicking **Add** or pressing Shift + Enter |
| [required] | <code>boolean</code> | <code>false</code> | Determine whether content in TextArea is required |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |
| [showSubmitButton] | <code>boolean</code> |  | Determine whether to show or hide the **Add** button. By default it's hidden if `rows="1"`, and it's visible if there are more than 1 row |
| [perRegion] | <code>boolean</code> |  | Use this tag to label regions instead of whole objects |
| [perItem] | <code>boolean</code> |  | Use this tag to label items inside objects instead of whole objects |

