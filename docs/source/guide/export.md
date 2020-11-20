---
title: Export results
type: guide
order: 105
---

Your annotations are stored in [raw completion format](#Completion-format) inside `my_project_name/completions` directory, one file per labeled task named as `task_id.json`.

You can optionally convert and export raw completions to a more common format by doing one of the following:

- From [/export](http://localhost:8080/export) page by choosing target format
- Applying [converter tool](https://github.com/heartexlabs/label-studio-converter) to `my_project_name/completions` directory
- By using [Export API](#Export-using-API)

## Basic format

The output data is stored in _completions_ - JSON formatted files, one per each completed task saved in project directory in `completions` folder or in the [`"output_dir"` option](setup.html#Structure) The example structure of _completion_ is the following:

```json
{
    "id": 1,

    "data": {
        "image": "https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
    },
    
    "completions": [
        {
            "id": "1001",
            "lead_time": 15.053,
            "result": [
                {
                    "from_name": "tag",
                    "id": "Dx_aB91ISN",
                    "source": "$image",
                    "to_name": "img",
                    "type": "rectanglelabels",
                    "value": {
                        "height": 10.458911419423693,
                        "rectanglelabels": [
                            "Moonwalker"
                        ],
                        "rotation": 0,
                        "width": 12.4,
                        "x": 50.8,
                        "y": 5.869797225186766
                    }
                }
            ]
        }
    ],

    "predictions": [
        {
            "created_ago": "3 hours",
            "model_version": "model 1",
            "result": [
                {
                    "from_name": "tag",
                    "id": "t5sp3TyXPo",
                    "source": "$image",
                    "to_name": "img",
                    "type": "rectanglelabels",
                    "value": {
                        "height": 11.612284069097889,
                        "rectanglelabels": [
                            "Moonwalker"
                        ],
                        "rotation": 0,
                        "width": 39.6,
                        "x": 13.2,
                        "y": 34.702495201535505
                    }
                }
            ]
        },
        {
            "created_ago": "4 hours",
            "model_version": "model 2",
            "result": [
                {
                    "from_name": "tag",
                    "id": "t5sp3TyXPo",
                    "source": "$image",
                    "to_name": "img",
                    "type": "rectanglelabels",
                    "value": {
                        "height": 33.61228406909789,
                        "rectanglelabels": [
                            "Moonwalker"
                        ],
                        "rotation": 0,
                        "width": 39.6,
                        "x": 13.2,
                        "y": 54.702495201535505
                    }
                }
            ]
        }
    ]
}
```

### completions

That's where the list of labeling results per one task is stored.

#### id
Unique completion identifier

#### lead_time
Time in seconds spent to create this completion

#### result

Completion result data

##### id

Unique completion result identifier

##### from_name

Name of the tag that was used to label region ([control tags](/tags))

##### to_name

Name of the object tag that provided the region to be labeled ([object tags](/tags))

##### type

Type of the labeling/tag

#### value

Tag specific value that includes the labeling result details. The exact structure of value depends on the chosen labeling tag. 
[Explore each tag](/tags) for more details.


### data

Data copied from [input task](tasks.html#Basic-format)

### id

Task identifier

### predictions

Machine learning predictions (aka _pre-labeling results_). Follows the [same format](export.html#completions) as completion, with some additional fields related to machine learning inference:

- **score** - the overall result score (probabilistic output, confidence level, etc.)


## Export formats

### JSON

List of items in [raw completion format](#Completion-format) stored in JSON file

### JSON_MIN

List of items where only `"from_name", "to_name"` values from [raw completion format](#Completion-format) are kept:

```json
{
  "image": "https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
  "tag": [{
    "height": 10.458911419423693,
    "rectanglelabels": [
        "Moonwalker"
    ],
    "rotation": 0,
    "width": 12.4,
    "x": 50.8,
    "y": 5.869797225186766
  }]
}
```

### CSV

Results are stored in comma-separated tabular file with column names specified by `"from_name"` `"to_name"` values

### TSV

Results are stored in tab-separated tabular file with column names specified by `"from_name"` `"to_name"` values


### CONLL2003

Popular format used for [CoNLL-2003 named entity recognition challenge](https://www.clips.uantwerpen.be/conll2003/ner/)


### COCO

Popular machine learning format used by [COCO dataset](http://cocodataset.org/#home) for object detection and image segmentation tasks


### Pascal VOC XML

Popular XML-formatted task data used for object detection and image segmentation tasks

### Brush Labels to Numpy & PNG

Export your brushe labels to numpy 2d arrays and PNG images. One label is equal to one image.   

## Export using API

You can export results using server API. Check [API page](api.html) for more details.