---
title: HyperText
type: tags
order: 304
meta_title: Hypertext Tags for Hypertext Markup (HTML)
meta_description: Label Studio Hypertext Tags customize Label Studio for hypertext markup (HTML) for machine learning and data science projects.
---

The `HyperText` tag displays hypertext markup for labeling. Use for labeling HTML-encoded text and webpages for NER and NLP projects.

Use with the following data types: HTML.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Value of the element |
| [valueType] | <code>url</code> \| <code>text</code> | <code>text</code> | Whether the text is stored directly in uploaded data or needs to be loaded from a URL |
| [inline] | <code>boolean</code> | <code>false</code> | Whether to embed HTML directly in Label Studio or use an iframe |
| [saveTextResult] | <code>yes</code> \| <code>no</code> |  | Whether to store labeled text along with the results. By default, doesn't store text for `valueType=url` |
| [encoding] | <code>none</code> \| <code>base64</code> \| <code>base64unicode</code> |  | How to decode values from encoded strings |
| [selectionEnabled] | <code>boolean</code> | <code>true</code> | Enable or disable selection |
| [clickableLinks] | <code>boolean</code> | <code>false</code> | Whether to allow opening resources from links in the hypertext markup. |
| [highlightColor] | <code>string</code> |  | Hex string with highlight color, if not provided uses the labels color |
| [showLabels] | <code>boolean</code> |  | Whether or not to show labels next to the region; unset (by default) — use editor settings; true/false — override settings |
| [granularity] | <code>symbol</code> \| <code>word</code> \| <code>sentence</code> \| <code>paragraph</code> |  | Control region selection granularity |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| value | <code>Object</code> |  |
| value.start | <code>string</code> | xpath of the container where the region starts (xpath) |
| value.end | <code>string</code> | xpath of the container where the region ends (xpath) |
| value.startOffset | <code>number</code> | offset within start container |
| value.endOffset | <code>number</code> | offset within end container |
| [value.text] | <code>string</code> | text content of the region, can be skipped |

### Example JSON
```json
{
  "value": {
    "start": "/div[1]/p[2]/text()[1]",
    "end": "/div[1]/p[4]/text()[3]",
    "startOffset": 2,
    "endOffset": 81,
    "hypertextlabels": ["Car"]
  }
}
```

### Example

Labeling configuration to label HTML content

```html
<View>
  <HyperText name="text-1" value="$text" />
  <Labels name="parts" toName="text-1">
    <Label value="Caption" />
    <Label value="Article" />
    <Label value="Author" />
  </Labels>
</View>
```
### Example
```html
<View>
  <HyperText name="p1">
    <p>Some explanations <em>with style</em></p>
  </HyperText>
</View>
```
