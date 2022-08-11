---
title: Ranker
type: tags
order: 419
meta_title: Ranker Tag for Model Ranking
meta_description: Customize Label Studio with the Ranker tag to rank the predictions from different models to rank model quality in your machine learning and data science projects.
---

Use the Ranker tag to rank the results from models. This tag uses the "prediction" field from a labeling task instead of the "data" field to display content for labeling on the interface. Carefully structure your labeling tasks to work with this tag. See [import pre-annotated data](../guide/predictions.html).

Use with the following data types: text

The Ranker tag renders a given list of strings and allows you to drag and reorder them.
To see this tag in action:
1. Save the example JSON below as a file called <code>example_ranker_tag.json</code>.
2. Upload it as a task on the Label Studio UI.
3. Set up a project with the given labeling configuration.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of group |
| [axis] | <code>y</code> \| <code>x</code> | <code>y</code> | Whether to use a vertical or horizantal axis direction for ranking |
| lockAxis | <code>x</code> \| <code>y</code> |  | Lock axis |
| sortedHighlightColor | <code>string</code> |  | Sorted color in HTML color name |

### Example
```html
<!--Labeling configuration for ranking predicted text output from a model -->
<View>
  <Text name="txt-1" value="$text"></Text>
  <Ranker name="ranker-1" toName="txt-1" ranked="true" sortedHighlightColor="red"></Ranker>
</View>
```
### Example
```html
<!--Example JSON task to use to see the Ranker tag in action -->
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
