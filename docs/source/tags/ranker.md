---
title: Ranker
type: tags
order: 419
meta_title: Ranker Tag allows you to rank items in a List or, if Buckets are used, pick relevant items from a List
meta_description: Customize Label Studio by sorting results for machine learning and data science projects.
---

The `Ranker` tag is used to rank items in a `List` tag or pick relevant items from a `List`, depending on using nested `Bucket` tags.
In simple case of `List` + `Ranker` tags the first one becomes interactive and saved result is a dict with the only key of tag's name and with value of array of ids in new order.
With `Bucket`s any items from the `List` can be moved to these buckets, and resulting groups will be exported as a dict `{ bucket-name-1: [array of ids in this bucket], ... }`
By default all items will sit in `List` and will not be exported, unless they are moved to a bucket. But with `default="true"` parameter you can specify a bucket where all items will be placed by default, so exported result will always have all items from the list, grouped by buckets.
Columns and items can be styled in `Style` tag by using respective `.htx-ranker-column` and `.htx-ranker-item` classes. Titles of columns are defined in `title` parameter of `Bucket` tag.
Note: When `Bucket`s used without `default` param, the original list will also be stored as "_" named column in results, but that's internal value and this may be changed later.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the element |
| toName | <code>string</code> | List tag name to connect to |

### Example

Visual appearance can be changed via Style tag with these predefined classnames

```html
<View>
  <Style>
    .htx-ranker-column { background: cornflowerblue; }
    .htx-ranker-item { background: lightgoldenrodyellow; }
  </Style>
  <List name="results" value="$items" title="Search Results" />
  <Ranker name="rank" toName="results" />
</View>
```
### Example

Example task data for Ranker tag

```json
{
  "items": [
    { "id": "blog", "title": "10 tips to write a better function", "body": "There is nothing worse than being left in the lurch when it comes to writing a function!" },
    { "id": "mdn", "title": "Arrow function expressions", "body": "An arrow function expression is a compact alternative to a traditional function" },
    { "id": "wiki", "title": "Arrow (computer science)", "body": "In computer science, arrows or bolts are a type class..." }
  ]
}
```
### Example

Example result for Ranker tag

```json
{
  "from_name": "rank",
  "to_name": "results",
  "type": "ranker",
  "value": { "ranker": { "rank": ["mdn", "wiki", "blog"] } }
}
```
### Example

Example of using Buckets with Ranker tag

```html
<View>
  <List name="results" value="$items" title="Search Results" />
  <Ranker name="rank" toName="results">
    <Bucket name="best" title="Best results" />
    <Bucket name="ads" title="Paid results" />
  </Ranker>
</View>
```
### Example

Example result for Ranker tag with Buckets; data is the same

```json
{
  "from_name": "rank",
  "to_name": "results",
  "type": "ranker",
  "value": { "ranker": {
    "best": ["mdn"],
    "ads": ["blog"]
  } }
}
```
