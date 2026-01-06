---
title: Ranker
type: tags
order: 419
meta_title: Ranker Tag 
meta_description: Use the Ranker tag to sort list items. 
---

You can use `Ranker` to select relevant items from a `List` and sort them. You can either sort them to order them or sort them into buckets (defined using a nested `Bucket` tag). 

Use with the following data types: [`List`](list). 


{% insertmd includes/tags/ranker.md %}


## List + Ranker

When you use `List` with `Ranker` (and no buckets), the list becomes interactive so that users can reorder items.

### Example labeling config

You can style the ranker layout using the `Style` tag:

* `.htx-ranker-column` for columns (buckets)

* `.htx-ranker-item `for items

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

### Example input data

Example list to use as input data:

```json
{
  "items": [
    { "id": "blog", "title": "10 tips to write a better function", "body": "There is nothing worse than being left in the lurch when it comes to writing a function!" },
    { "id": "mdn", "title": "Arrow function expressions", "body": "An arrow function expression is a compact alternative to a traditional function" },
    { "id": "wiki", "title": "Arrow (computer science)", "body": "In computer science, arrows or bolts are a type class..." }
  ]
}
```

### Example results

The saved result is a dictionary with one key (the Ranker tag’s name) and a value that is an array of list item IDs in their new order.

In this example, the annotator moved the list item with `"id": "mdn"` to the top, and `"id": "blog"` to the bottom. The data output would appear as follows:

```json
[
  {
    "value": {
      "ranker": {
        "rank": [
          "mdn",
          "wiki",
          "blog"
        ]
      }
    },
    "id": "PpwBv_NMxd",
    "from_name": "rank",
    "to_name": "results",
    "type": "ranker",
    "origin": "manual"
  }
]
```

## List + Ranker + Buckets

When you use `Ranker` with a nested `Bucket`, you can sort list items into bucket categories. 

### Example labeling config 

See the [example above](#Example-labeling-config) for notes on adding styling. 

```html
<View>
  <List name="results" value="$items" title="Search Results" />
  <Ranker name="rank" toName="results">
    <Bucket name="best" title="Best results" />
    <Bucket name="ads" title="Paid results" />
  </Ranker>
</View>
```

### Example input data

See the [example list](#Example-input-data) provided above. 

### Example results

The saved result is a dictionary where each key is the bucket name and each value is an array of item IDs in that bucket, for example:

```json
[
  {
    "value": {
      "ranker": {
        "_": [
          "wiki"
        ],
        "best": [
          "mdn"
        ],
        "ads": [
          "blog"
        ]
      }
    },
    "id": "sjYK7Bcl7g",
    "from_name": "rank",
    "to_name": "results",
    "type": "ranker",
    "origin": "manual"
  }
]
```

Note that the `"_"` array contains the list items that were **not** sorted into buckets. 

You can change this behavior by designating a default bucket. See the example below. 

### Default buckets

You can mark a default bucket by adding `default="true"` to the bucket's parameters:

```html
<View>
  <List name="results" value="$items" title="Search Results" />
  <Ranker name="rank" toName="results">
    <Bucket name="best" title="Best results" default="true" />
    <Bucket name="ads" title="Paid results" />
  </Ranker>
</View>
```

This does two things:

- Hides the "Search Results" column (the column that contained all the unsorted list items)
- Places the unsorted list items into the default bucket
  
This would also affect your results so that unsorted list items are stored under the default bucket key, for example:

```json
[
  {
    "value": {
      "ranker": {
        "best": [
          "mdn",
          "wiki"
        ],
        "ads": [
          "blog"
        ]
      }
    },
    "id": "8QaNxe4hN3",
    "from_name": "rank",
    "to_name": "results",
    "type": "ranker",
    "origin": "manual"
  }
]
```

## Related templates

- [Visual Ranker](/templates/generative-visual-ranker)
- [RAG Retrieval](/templates/generative-llm-ranker)