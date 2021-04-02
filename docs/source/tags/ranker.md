---
title: Ranker
type: tags
order: 416
meta_title: Ranker Tags for Model Ranking
meta_description: Label Studio Ranker Tags customize Label Studio for model ranking for machine learning and data science projects.
---

Ranker tag, used to ranking models

Ranker has a complex mechanics and uses only the "prediction" field from the input task,
please explore input task example carefully.

It renders given list of strings and allows to drag and reorder them.
To see this tag in action you have to use json below as task on "Import" page:
setup given config, go to Import, then copy-paste json to the input field and submit.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | of group |
| [axis] | <code>y</code> \| <code>x</code> | <code>y</code> | axis direction |
| sortedHighlightColor | <code>string</code> |  | sorted color |

### Example
```html
<View>
  <Text name="txt-1" value="$text"></Text>
  <Ranker name="ranker-1" toName="txt-1" ranked="true" sortedHighlightColor="red"></Ranker>
</View>
```
### Example
```json
[{
  "data": {
    "text": "Some text for ranker"
  },
  "predictions": [{
    "model_version": "1564027355",
    "result": [{
      "from_name": "ranker-1",
      "to_name": "ranker-1",
      "type": "ranker",
      "value": {
        "items": ["abc", "def", "ghk", "more more more", "really long text"],
        "weights": [1.00, 0.78, 0.75, 0.74, 0.74],
        "selected": [false, false, false, false, false]
      }
    }],
    "score": 1.0
  }]
}]
```
