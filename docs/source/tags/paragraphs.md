---
title: Paragraphs
type: tags
order: 306
meta_title: Paragraph Tags for Paragraphs
meta_description: Customize Label Studio with the Paragraphs tag to annotate paragraphs for NLP and NER machine learning and data science projects.
---

The `Paragraphs` tag displays paragraphs of text on the labeling interface. Use to label dialogue transcripts for NLP and NER projects.
The `Paragraphs` tag expects task data formatted as an array of objects like the following:
[{ $nameKey: "Author name", $textKey: "Text" }, ... ]

Use with the following data types: text.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing the paragraph content |
| [valueType] | <code>json</code> \| <code>url</code> | <code>json</code> | Whether the data is stored directly in uploaded JSON data or needs to be loaded from a URL |
| audioUrl | <code>string</code> |  | Audio to sync phrases with |
| [sync] | <code>string</code> |  | object name to sync with |
| [showPlayer] | <code>boolean</code> | <code>false</code> | Whether to show audio player above the paragraphs. Ignored if sync object is audio |
| [saveTextResult] | <code>no</code> \| <code>yes</code> | <code>yes</code> | Whether to store labeled text along with the results. By default, doesn't store text for `valueType=url` |
| [layout] | <code>none</code> \| <code>dialogue</code> | <code>none</code> | Whether to use a dialogue-style layout or not |
| [nameKey] | <code>string</code> | <code>&quot;author&quot;</code> | The key field to use for name |
| [textKey] | <code>string</code> | <code>&quot;text&quot;</code> | The key field to use for the text |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| value | <code>Object</code> |  |
| value.start | <code>number</code> | index of paragraph where the region starts |
| value.end | <code>number</code> | index of paragraph where the region ends (xpath) |
| value.startOffset | <code>number</code> | offset within start paragraph |
| value.endOffset | <code>number</code> | offset within end paragraph |
| [value.text] | <code>string</code> | text content of the region, can be skipped |

### Example JSON
```json
{
  "value": {
    "start": 3,
    "end": 5,
    "startOffset": 2,
    "endOffset": 81,
    "paragraphlabels": ["Car"]
  }
}
```

### Example

Labeling configuration to label paragraph regions of text containing dialogue

```html
<View>
  <Paragraphs name="dialogue-1" value="$dialogue" layout="dialogue" />
  <ParagraphLabels name="importance" toName="dialogue-1">
    <Label value="Important content"></Label>
    <Label value="Random talk"></Label>
  </ParagraphLabels>
</View>
```
