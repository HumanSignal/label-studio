---
title: TextArea
type: tags
order: 427
meta_title: Textarea Tag for Text areas
meta_description: Customize Label Studio with the TextArea tag to support audio transcription, image captioning, and OCR tasks for machine learning and data science projects.
---

The `TextArea` tag is used to display a text area for user input. Use for transcription, paraphrasing, or captioning tasks.

Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to label |
| value | <code>string</code> |  | Pre-filled value |
| [label] | <code>string</code> |  | Label text |
| [placeholder] | <code>string</code> |  | Placeholder text |
| [maxSubmissions] | <code>string</code> |  | Maximum number of submissions |
| [editable] | <code>boolean</code> | <code>false</code> | Whether to display an editable textarea |
| [skipDuplicates] | <code>boolean</code> | <code>false</code> | Prevent duplicates in textarea inputs |
| [transcription] | <code>boolean</code> | <code>false</code> | If false, always show editor |
| [displayMode] | <code>tag</code> \| <code>region-list</code> | <code>tag</code> | Display mode for the textarea; region-list shows it for every region in regions list |
| [rows] | <code>number</code> |  | Number of rows in the textarea |
| [required] | <code>boolean</code> | <code>false</code> | Validate whether content in textarea is required |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |
| [showSubmitButton] | <code>boolean</code> |  | Whether to show or hide the submit button. By default it shows when there are more than one rows of text, such as in textarea mode. |
| [perRegion] | <code>boolean</code> |  | Use this tag to label regions instead of whole objects |
| [perItem] | <code>boolean</code> |  | Use this tag to label items inside objects instead of whole objects |

### Example

Basic labeling configuration to display only a text area

```html
<View>
  <TextArea name="ta"></TextArea>
</View>
```
### Example

You can combine the `TextArea` tag with other tags for OCR or other transcription tasks

```html
<View>
  <Image name="image" value="$ocr"/>
  <Labels name="label" toName="image">
    <Label value="Product" background="#166a45"/>
    <Label value="Price" background="#2a1fc7"/>
  </Labels>
  <Rectangle name="bbox" toName="image" strokeWidth="3"/>
  <TextArea name="transcription" toName="image" editable="true" perRegion="true" required="true" maxSubmissions="1" rows="5" placeholder="Recognized Text" displayMode="region-list"/>
</View>
```
### Example

You can keep submissions unique.

```html
<View>
  <Audio name="audio" value="$audio"/>
  <TextArea name="genre" toName="audio" skipDuplicates="true" />
</View>
```
