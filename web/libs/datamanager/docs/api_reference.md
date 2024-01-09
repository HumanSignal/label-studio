# API Reference

DataManager uses LabelStudio API to operate.

Request parameters should be JSON.

Responses are in JSON as well.

- [/project](#/project)
- [/project/columns](#/project/columns)
- [/project/tabs](#/project/tabs)
- [/project/tabs/:tabID](#/project/tabs/:tabID)
- [/project/tabs/:tabID/tasks](#/project/tabs/:tabID/tasks)
- [/tasks/:taskID](#/tasks/:taskID)
- [/project/next](#/project/next)
- [/project/tabs/:tabID/annotations](#/project/tabs/:tabID/annotations)
- [/tasks/:taskID/annotations](#/tasks/:taskID/annotations)
- [/tasks/:taskID/annotations/:id](#/tasks/:taskID/annotations/:id)
- [/project/tabs/:tabID/selected-items](#/project/tabs/:tabID/selected-items)
- [/project/actions](#/project/actions)
- [/project/tabs/:tabID/actions](#/project/tabs/:tabID/actions)

### `/project`

##### **GET**

Information about current project

---

### `/project/columns`

##### **GET**

Information about columns of the dataset.

#### Response

| Parameter | Type | Description |
| -----------                           | ----------- | ------------ |
| columns                             | List<[Column](#Column)> | List of columns |

---

#### `/project/tabs`

##### **GET**

Information about tabs in current project

| Property | Type              | Description  |
| -------- | ----------------- | ------------ |
| tabs     | List<[Tab](#Tab)> | List of tabs |

---

### `/project/tabs/:tabID`

##### **POST**

Create tab or update existing one.

| Property | Value                    | Description                      |
| -------- | ------------------------ | -------------------------------- |
| body     | JSON encoded [Tab](#Tab) | Data to create or update the tab |

##### **DELETE**

Delete specific tab

---

### `/project/tabs/:tabID/tasks`

##### **GET**

Pages set of samples from the dataset filtered by [Filter](#Filter).

###### Request parameters (set automatically by DataManager):

| Property    | Type                               | Description                                                  |
| ----------- | ---------------------------------- | ------------------------------------------------------------ |
| page        | Int                                | Page to load                                                 |
| page_size   | Int                                | Amount of tasks per page                                     |
| interaction | "scroll" \| "filter" \| "ordering" | This value is used by LS to optimize requests to the underlying storage |

###### Response parameters:

| Property          | Type                | Description                               |
| ----------------- | ------------------- | ----------------------------------------- |
| tasks             | List<[Task](#Task)> | Tasks are samples from your dataset       |
| total             | Int                 | Total amount of tasks                     |
| total_annotations | Int                 | Total amount of annotations for the tasks |
| total_predictions | Int                 | Total amount of annotations for the tasks |



---

### `/tasks/:taskID`

##### **GET**

Returns a specific task

| Property | Type          | Description        |
| -------- | ------------- | ------------------ |
| task     | [Task](#Task) | Single task entity |



---

### `/project/next`

##### **GET**

According to sampling settings returns next task in the dataset

| Property | Type          | Description        |
| -------- | ------------- | ------------------ |
| task     | [Task](#Task) | Single task entity |



---

### `/project/tabs/:tabID/annotations`

##### **GET**

Annotations for the current dataset

| Property    | Type             | Description                                               |
| ----------- | ---------------- | --------------------------------------------------------- |
| annotations | List<Annotation> | See Label Studio documentation to learn about annotations |



---

### `/tasks/:taskID/annotations`

##### **GET**

Annotations for the current dataset

| Property    | Type             | Description                                                  |
| ----------- | ---------------- | ------------------------------------------------------------ |
| annotations | List<Annotation> | See Label Studio documentation to learn more about annotations |

##### **POST** `[was_skipped=true]`

If `was_skipped` parameter is passed, creates a annotation marked as rejected

| Property    | Type                    | Description                                         |
| ----------- | ----------------------- | --------------------------------------------------- |
| body        | JSON encoded Annotation |                                                     |
| was_skipped | 1 \| null               | Creates new annotation with `was_skipped=true` flag |

---

### `/tasks/:taskID/annotations/:id`

##### **GET**

Get a annotation for a specific task

##### **POST** `[was_skipped=true]`

If `was_skipped` parameter is passed, marks an existing annotation as rejected

###### Request parameters

| Property    | Type                    | Description                                               |
| ----------- | ----------------------- | --------------------------------------------------------- |
| body        | JSON encoded Annotation |                                                           |
| was_skipped | 1 \| null               | Tells the backend to mark the annotation as `was_skipped` |

##### **DELETE**

Delete annotation

| Property | Type | Description           |
| -------- | ---- | --------------------- |
| id       | Int  | Deleted annotation id |



---

### `/project/tabs/:tabID/selected-items`

This method manages selected items list – tasks, that you marked as selected. List of selected task is stored on a tab level.

##### **POST**

Override selected items list.

###### Request parameters

| Property | Type                                         | Description             |
|----------|----------------------------------------------|-------------------------|
| body     | JSON encoded [SelectedItems](#SelectedItems) | Selected items to write |

##### **PATCH**

Add items to the list. This method does not override SelectedItems, instead it modifies the list.

###### Request parameters

| Property | Type                                         | Description             |
|----------|----------------------------------------------|-------------------------|
| body     | JSON encoded [SelectedItems](#SelectedItems) | Selected items to write |

##### **DELETE**

Remove items from the list.

###### Request parameters

| Property | Type                                         | Description             |
|----------|----------------------------------------------|-------------------------|
| body     | JSON encoded [SelectedItems](#SelectedItems) | Selected items to write |
---

### `/project/actions`

##### GET

Returns a list of available actions. Actions can be applied to

- single task
- selected tasks
- whole tab

| Property    | Type                         | Description                                                  |
| ----------- | ---------------------------- | ------------------------------------------------------------ |
| id          | String                       | String-based code of the action                              |
| title       | String                       | Human readable label of the action                           |
| order       | Int                          | Acts as a weight for the task and affects the order of buttons in Data Manager |
| dialog      | Dist<String, String> \| null | Confirmation dialog. It will be shown on button press before executing the action |
| dialog.text | String                       | Dialog text                                                  |
| dialog.type | String                       | Dialog type                                                  |



---

### `/project/tabs/:tabID/actions`

##### POST

Invokes a given action.

Doesn't require any parameters.

## Type Reference

### Tab

Tab represents a materialized view that can slice and order the data

| Property           | Type                                                         | Description                                    |
| ------------------ | ------------------------------------------------------------ | ---------------------------------------------- |
| id                 | Int                                                          | Tab identifier                                 |
| type               | "list" \| "grid"                                             | Display type                                   |
| title              | String                                                       | Human readable title                           |
| target             | "tasks" \| "annotations"                                     | Currently shown entity type                    |
| filters            | [Filter](#Filter)                                            | Filter applied to the tab                      |
| ordering           | List<[ColumnAlias](#ColumnAlias) \| -[ColumnAlias](#ColumnAlias)> | Ordering applied to the tab                    |
| selectedItems      | [SelectedItems](#SelectedItems)                              | List of checked samples                        |
| columnsDisplayType | Dict<[ColumnAlias](#ColumnALias), [ColumnType](#ColumnType)> | List of display types override for data values |
| columnsWidth       | Dict<[ColumnAlias](#ColumnAlias), int>                       | Width of each individual column                |
| hiddenColumns      | Dict<"explore" \| "labeling", List<[ColumnAlias](#ColumnAlias)>> | List of hidden tabs per view                   |

### Filter

Filter specifies what data will be shown in the tab

| Property      | Type          | Description  |
| ---           | ---           | ---          |
| conjunction   | "and" \| "or" | How filter items are combined for the comparison |
| items         | List<[FilterItem](#FilterItem)> | Single filter |

### FilterItem

| Property      | Type          | Description  |
| ---           | ---           | ---          |
| filter        | "filter:[ColumnAlias](#ColumnAlias)" | Path to the property |
| type          | [ColumnType](#ColumnType) | Type of the column |
| operator      | [FilterOperator](#FilterOperator) | Operator of the comparison |
| value         | String | Value to compare |

### FilterOperator

| Operator         | Input                  | Description                                     |
| ---------------- | ---------------------- | ----------------------------------------------- |
| equal            | String \| Number       | Direct equality comparison                      |
| not_equal        | String \| Number       | Direct inequality comparison                    |
| contains         | String \| Number       | Check wther string contains a substring         |
| not_contains     | String \| Number       | Check wther string does not contain a substring |
| less             | Number                 | Value is less than an input                     |
| greater          | Number                 | Value is greater than an input                  |
| less_or_equal    | Number                 | Value is less or equal to input                 |
| greater_or_equal | Number                 | Value is greater or equal to input              |
| in               | List<String \| Number> | Value is in a list                              |
| not_in           | List<String \| Number> | Value is not in a list                          |
| empty            | Boolean                | Value is empty                                  |





### Column

`Column` represents a single field of the dataset samle:

| Property | Type | Description |
| -------- | ---- | ----------- |
| column.id                           | String | Column identifier |
| column.parent                       | String \| null | Parent identifier |
| column.target                     | "tasks" \| "annotations" | Entity the column is attached to |
| column.title                      | String | Human readable title |
| column.type                         | [ColumnType](#ColumnType) | Column value type |
| column.children                     | List<String> \| null | Column identifier |
| column.visibility_defaults          | Dict<"explore"\|"labeling", Boolean> | Column identifier |

### ColumnType

Represents a type of a column value. Column can have one of the tipes listed below.

| Type          | Description |
| ---           | - |
| String      | Primitive string |
| Boolean     | Primitive boolean |
| Number      | `Int` or `Double` |
| Datetime    | Date and time in ISO format |
| List<T>     | List of items. T can be one of the types listed in this table |
| Image       | Image url |
| Audio       | Audio url |
| Text        | Text string |
| HyperText   | HTML or XML based markup |
| TimeSeries  | TimeSeries data |
| Unknown     | Type cannot be determined by the backend |

### ColumnAlias

`ColumnAlias` is an aggregated field that combines full path to the column. ColumnAlias is built using the following rules:

- `[target]:[column_name]`
- `[target]:[full_path].[column_name]`

Full path is a path that combines all parent columns. E.g. you have a `data` column that contains several values:

```json
{
  "data": {
    "image": "https://example.com/image.jpg"
  }
}
```

In this case columns will look like this:

```json
{
  "columns": [
    {
      "id": "data",
      "title": "Data",
      "children": ["image"],
      "target": "tasks",
    },
    {
      "id": "image",
      "title": "image",
      "parent": "data",
      "target": "tasks",
    }
  ]
}
```

As the columns list is flat, full path will reference all ascending columns: `tasks:data.image`

In some cases `ColumnAlias` might be negative. For example negative values are used for ordering: `-tasks:data.image`

### SelectedItems

| Property | Type      | Default | Description                                                  |
| -------- | --------- | ------- | ------------------------------------------------------------ |
| all      | Boolean   | false   | When true, all items in the dataset implied as selected      |
| included | List<Int> | []      | When `all=false` this list specifies selected items          |
| excluded | List<Int> | []      | When `all=true` this list specifies the items to exclude from selection |

Selected items is an object that stores samples checked in the UI. To operate effectively on large amounts of data it uses partial selection approach. The structure of this object is the following:

```json
// In this case we select only items with IDs 1, 2 and 3
{
  "selectedItems": {
    "all": false,
    "included": [1, 2, 3]
  }
}

// SelectedItems can select all the items in the dataset regardless of the size
{
  "selectedItems": {
    "all": true,
  }
}

// With `excluded` list you can select all but `excluded`
// In this example we select all items except 1, 2 and 3
{
  "selectedItems": {
    "all": true,
    "excluded": [1, 2, 3]
  }
}
```

### Task

Task is a single sample from the dataset.

| Property              | Type              | Description                                             |
| --------------------- | ----------------- | ------------------------------------------------------- |
| id                    | Int               | Task identifier generated by LS                         |
| cancelled_annotations | Int               | Number of cancelled (rejected) annotations for the task |
| completed_at          | DateTime          | Creation date of the last annotation                    |
| predictions_result    | String            |                                                         |
| total_annotations     | Int               | Total annotations for the task                          |
| total_predictions     | Int               | Total predictions fo the task                           |
| data                  | Dict<String, Any> | Data from the dataset                                   |
| extra                 | Dict<String, Any> | Any extra data for the task                             |
