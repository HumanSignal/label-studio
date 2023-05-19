---
title: List
type: tags
order: 304
meta_title: List Tag displays items of the same type, like articles, search results, etc.
meta_description: Customize Label Studio by displaying similar items from task data for machine learning and data science projects.
---

The `List` tag is used to display a list of similar items like articles, search results, etc. Task data referred in `value` parameter should be an array of objects with `id`, `title`, and `body` fields.
It's much more lightweight than group of other tags like Text. And you can attach classification to provide additional data about this list.
Can be used with `Ranker` tag to rank items or pick relevant items from a list.
Items can be styled in `Style` tag by using `.htx-ranker-item` class.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the element |
| value | <code>string</code> | Data field containing a JSON with array of objects (id, title, body) to rank |
| [title] | <code>string</code> | Title of the list |

### Example

Visual appearance can be changed via Style tag with these classnames

```html
<View>
  <Style>
    .htx-ranker-column { background: cornflowerblue; }
    .htx-ranker-item { background: lightgoldenrodyellow; }
  </Style>
  <List name="results" value="$items" title="Search Results" />
</View>
```
### Example

Example data for List tag

```json
{
  "items": [
    { "id": "blog", "title": "10 tips to write a better function", "body": "There is nothing worse than being left in the lurch when it comes to writing a function!" },
    { "id": "mdn", "title": "Arrow function expressions", "body": "An arrow function expression is a compact alternative to a traditional function" },
    { "id": "wiki", "title": "Arrow (computer science)", "body": "In computer science, arrows or bolts are a type class..." },
  ]
}
```
