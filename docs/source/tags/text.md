---
title: Text
type: tags
order: 307
meta_title: Text Tags for Text Objects
meta_description: Customize Label Studio with the Text tag to annotate text for NLP and NER machine learning and data science projects.
---

The Text tag shows text that can be labeled. Use to display any type of text on the labeling interface.
You can use `<Style>.htx-text{ white-space: pre-wrap; }</Style>` to preserve all spaces in the text, otherwise spaces are trimmed when displayed.
Every space in the text sample is counted when calculating result offsets, for example for NER labeling tasks.

Use with the following data types: text

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing text or a URL |
| [valueType] | <code>url</code> \| <code>text</code> |  | Whether the text is stored directly in task or needs to be loaded by url |
| [saveTextResult] | <code>yes</code> \| <code>no</code> |  | Whether to store labeled text along with the results. By default, doesn't store text for `valueType=url` |
| [selectionEnabled] | <code>boolean</code> | <code>true</code> | Whether to enable or disable text selection |
| [highlightColor] | <code>string</code> |  | Hex color string to highlight text. If not provided, label color is used |
| [granularity] | <code>symbol</code> \| <code>word</code> | <code>symbol</code> | Whether to select text per symbol or word |
| [showLabels] | <code>boolean</code> | <code>true</code> | Whether to show labels next to the region |
| [encoding] | <code>string</code> | <code>&quot;none|base64|base64unicode&quot;</code> | How to decode values from encoded strings |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| value | <code>Object</code> |  |
| value.start | <code>string</code> | position of the start of the region in characters |
| value.end | <code>string</code> | position of the end of the region in characters |
| [value.text] | <code>string</code> | text content of the region, can be skipped |

### Example JSON
```json
{
  "value": {
    "start": 2,
    "end": 81,
    "labels": ["Car"]
  }
}
```

### Example
```html
<!--Labeling configuration to label text for NER tasks with a word-level granularity -->
<View>
  <Text name="text-1" value="$text" granularity="word" highlightColor="#ff0000" />
  <Labels name="ner" toName="text-1">
    <Label value="Person" />
    <Label value="Location" />
  </Labels>
</View>
```
