---
title: Ranker
type: tags
order: 305
meta_title: Ranker Tag displays items that can be dragged and dropped between columns
meta_description: Customize Label Studio by displaying and sorting results for machine learning and data science projects.
---

The `Ranker` tag is used to rank items in a list or pick relevant items from a list, depending on `mode` parameter. Task data referred in `value` parameter should be an array of objects with `id`, `title`, and `body` fields.
Results are saved as an array of `id`s in `result` field.
Columns and items can be styled in `Style` tag by using respective `.htx-ranker-column` and `.htx-ranker-item` classes. Titles of one or two columns are defined in single `title` parameter.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Data field containing a JSON with array of objects (id, title, body) to rank |
| [mode] | <code>rank</code> \| <code>select</code> | rank: 1 column, reorder to rank, select: 2 columns, drag results to second column to select |
| [title] | <code>string</code> | Title(s) of the column(s), separate them by `|` symbol for `mode="select" |

### Example

Visual appearance can be changed via Style tag with these classnames

```html
<View>
  <Style>
    .htx-ranker-column { background: cornflowerblue; }
    .htx-ranker-item { background: lightgoldenrodyellow; }
  </Style>
  <Ranker name="ranker" value="$items" mode="rank" title="Search Results"/>
</View>
```
### Example

Example data and result for Ranker tag

```json
{
  "items": [
    { "id": "blog", "title": "10 tips to write a better function", "body": "There is nothing worse than being left in the lurch when it comes to writing a function!" },
    { "id": "mdn", "title": "Arrow function expressions", "body": "An arrow function expression is a compact alternative to a traditional function" },
    { "id": "wiki", "title": "Arrow (computer science)", "body": "In computer science, arrows or bolts are a type class..." },
  ]
}
{
  "from_name": "ranker",
  "to_name": "ranker",
  "type": "ranker",
  "value": { "ranker": ["mdn", "wiki", "blog"] }
}
```
