---
title: HyperTextLabels
type: tags
order: 408
meta_title: Hypertext Label Tag to Create Labeled Hypertext (HTML)
meta_description: Customize Label Studio with the HyperTextLabels tag to label hypertext (HTML) for machine learning and data science projects.
---

The `HyperTextLabels` tag creates labeled hyper text (HTML). Use with the HyperText object tag to annotate HTML text or HTML elements for named entity recognition tasks.

Use with the following data types: HTML.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the HTML element to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure if you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum number of times a label can be used per task |
| [showInline] | <code>boolean</code> | <code>true</code> | Show labels in the same visual line |

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

Basic semantic text labeling configuration

```html
<View>
  <HyperTextLabels name="labels" toName="ht">
    <Label value="Header" />
    <Label value="Body Text" />
  </HyperTextLabels>
  <HyperText name="ht" value="$html" />
</View>
```
