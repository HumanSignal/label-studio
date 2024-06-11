---
title: Text
type: tags
order: 308
meta_title: Text Tags for Text Objects
meta_description: Customize Label Studio with the Text tag to annotate text for NLP and NER machine learning and data science projects.
---

The `Text` tag shows text that can be labeled. Use to display any type of text on the labeling interface.
You can use `<Style>.htx-text{ white-space: pre-wrap; }</Style>` to preserve all spaces in the text, otherwise spaces are trimmed when displayed and saved in the results.
Every space in the text sample is counted when calculating result offsets, for example for NER labeling tasks.

Use with the following data types: text.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing text or a UR |
| [valueType] | <code>url</code> \| <code>text</code> | <code>text</code> | Whether the text is stored directly in uploaded data or needs to be loaded from a URL |
| [saveTextResult] | <code>yes</code> \| <code>no</code> |  | Whether to store labeled text along with the results. By default, doesn't store text for `valueType=url` |
| [encoding] | <code>none</code> \| <code>base64</code> \| <code>base64unicode</code> |  | How to decode values from encoded strings |
| [selectionEnabled] | <code>boolean</code> | <code>true</code> | Enable or disable selection |
| [highlightColor] | <code>string</code> |  | Hex string with highlight color, if not provided uses the labels color |
| [showLabels] | <code>boolean</code> |  | Whether or not to show labels next to the region; unset (by default) — use editor settings; true/false — override settings |
| [granularity] | <code>symbol</code> \| <code>word</code> \| <code>sentence</code> \| <code>paragraph</code> |  | Control region selection granularity |

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

Labeling configuration to label text for NER tasks with a word-level granularity

```html
<View>
  <Text name="text-1" value="$text" granularity="word" highlightColor="#ff0000" />
  <Labels name="ner" toName="text-1">
    <Label value="Person" />
    <Label value="Location" />
  </Labels>
</View>
```
### Example
```html
<Text name="p1">Some simple text with explanations</Text>
```
