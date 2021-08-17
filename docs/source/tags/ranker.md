---
title: Ranker
type: tags
order: 416
meta_title: Ranker Tags for Model Ranking
meta_description: Label Studio Ranker Tags customize Label Studio for model ranking for machine learning and data science projects.
---

Ranker tag, used for ranking models.

Ranker has complex mechanics and uses only the "prediction" field from a labeling task. Please verify the information in the labeling task carefully.

It renders a given list of strings and allows you to drag and reorder them.
To see this tag in action you have to import the example JSON below as a task on "Import" page. Save it as a file called example_ranker_tag.json, then upload it.
Set up a project with the given configuration and the example JSON file.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of group |
| [axis] | <code>y</code> \| <code>x</code> | <code>y</code> | Axis direction |
| lockAxis | <code>x</code> \| <code>y</code> |  | Lock axis |
| sortedHighlightColor | <code>string</code> |  | Sorted color |

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
    "text": "Some text for the ranker tag"
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
