---
title: Format
type: guide
order: 102
---

## Input

Input should be JSON formatted. All the files that you want to label are expected to be hosted somewhere and provided as an URL in the JSON. The example backend server can process other formats, but it converts any format into the JSON as a result.

## Output

The output is JSON. The overall structure is the following:

```json
{
  "completions": [{ 
    "results": {
      "id": "yrSY-dipPI",
      "from_name": "sentiment",
      "to_name": "my_text",
      "type": "choices",
      "value": {
        "choices": ["Neutral"]
      }
    }
  }],
  "data": { "here are your task fields": "" }
}
```

A completion is an object with five mandatory fields:

- **id** unique id of the labeled region
- **from_name** name of the tag that was used to label region
- **to_name** name of the tag that provided the region to be labeled
- **type** type of the labeling/tag
- **value** tag specific value that includes the labeling result details

For popular machine learning libraries, there is converter code to transform Label Studio format in ML library format. [Learn More](/backend/converter/README.md)  about it.
