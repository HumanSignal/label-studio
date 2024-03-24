---
title: Retrieve imported data in the labeling configuration
short: Retrieve data
tier: all
type: guide
order: 208
order_enterprise: 108
meta_title: Retrieve data using the object tag
meta_description: How to retrieve imported data using object tags.
parent: "setup"
parent_enterprise: "setup"
date: 2024-03-24 02:02:03
---


In order to get data into tasks, you have to [import it](tasks). Then you have to specify how you want to retrieve that data to use it in a task. This is done with object tags. 

An object tag is a type of tag that indicates what data you are retrieving. Label Studio has the following object tags:

* [Audio](/tags/audio)
* [HyperText](/tags/hypertext) (HTML)
* [Image](/tags/image)
* [List](/tags/list)
* [Paragraphs](/tags/paragraphs)
* [Table](/tags/table)
* [Text](/tags/text)
* [TimeSeries](/tags/timeseries)
* [Video](/tags/video)


Use the following parameters in the object tag.

## `value` (required)

The `value` parameter represents the source of the data. It can be plain text or a step of complex data retrieval system. 

### Variables 

This is the most common way to specify the value and dynamically populates data. Variables are prefixed with a `$`. 

For example, `<Audio value="$audio" ... />` seeks the "audio" field in the imported JSON object:

```json
{
  "data": {
    "audio": "https://host.name/myaudio.wav"
  }
}
```

### Hardcoded string

The `value` parameter can also be a string, this is particularly useful for `Header` and `Text`. 

You can use the content of the tag as the value. This is useful for descriptive text tags and is applied for `Label` and `Choice`.

For example:

```xml
<Header>Label audio:</Header>
<Header value="Label only fully visible cars" />
<Text name="instruction" value="Label only fully visible cars" />

<Label>cat</Label>
<Choice>other</Choice>
```

### Other cases

The `value` parameter can be text containing variables:

For example:

```xml
 <Header value="url: $image"/>
```

The `value` parameter can also refer to nested data in arrays and dicts (`$texts[2]` and `$audio.url`). 

For example: 

```xml
  <Image name="image" value="$images[0]"/>
```


## `valueType` (optional)

The `valueType` parameter defines how to treat the data retrieved from the previous steps and whether it should be retrieved from uploaded data or from a URL. 

For example:

- Using “url”: `<Text name="text1" value="$text" valueType="url"/>` displays the text loaded by the URL.

- Using “text”: `<Text name="text" value="$text" valueType="text"/>` displays the URL without loading the text.

## `resolver` (optional)
    
Use this parameter to retrieve data from multi-column CSV on [S3 or other cloud storage](/guide/storage.html). Label Studio can retrieve it only in run-time, so it's secure.

If you import a file with a list of tasks, and every task in this list is a link to another file in the storage. In this case, you can use the `resolver` parameter to retrieve the content of these files from a storage. 

**Use case**

There is a list of tasks, where the "remote" field of every task is a link to a CSV file in the storage. Every CSV file has a “text” column with text to be labeled. For example:

Tasks:

```json
[
    { "remote": "s3://bucket/text1.csv" },
    { "remote": "s3://bucket/text2.csv" }
]
```

CSV file:

```csv
id;text
12;The most flexible data annotation tool. Quickly installable. Build custom UIs or use pre-built labeling templates.
```

**Solution**

To retrieve the file, use the following parameters:

1. `value="$remote"`: The URL to CSV on S3 is in "remote" field of task data. If you use the `resolver` parameter the `value` is always treated as URL, so you don't need to set `valueType`.

2. `resolver="csv|separator=;|column=text"`: Load this file in run-time, parse it as CSV, and get the “text” column from the first row. 

3. Display the result.

**Syntax**

The syntax for the `resolver` parameter consists of a list of options separated by a `|` symbol.

The first option is the type of file.

!!! note
    Currently, only CSV files are supported.

The remaining options are parameters of the specified file type with optional values. The parameters for CSV files are:

- `headless`: A CSV file does not have headers (this parameter is boolean and can't have a value).
- `separator=;`: CSV separator, usually can be detected automatically.
- `column=1`: In `headless` mode use zero-based index, otherwise use column name.

For example, `resolver="csv|headless|separator=;|column=1"`
