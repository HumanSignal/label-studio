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
| [resolveUrls] | <code>boolean</code> | <code>true</code> | Whether to resolve cloud storage URIs (s3://, gs://, etc.) in the loaded content when valueType is "url" |

### Result parameters

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

