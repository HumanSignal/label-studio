---
title: Data format
type: guide
order: 504
---

You can import the data directly through the web interfaces available at [http://127.0.0.1:8200/import](here) or alternatively by directly specifying the paths in your project folder. Edit server configuration file under [`"input_path"` option](config.html#input_path). Label Studio supports a number of different formats.

## Import data

### JSON file

The most common format for input tasks is single JSON-formatted file _tasks.json_ with tasks are expected to be a list of objects like:
```json
[
  {"my_key": "my_value_1"},
  {"my_key": "my_value_2"}
]
```
`"my_key"` is specified by `value` attribute from some [object tag from label config](/tags/text.html), e.g. `<Text value="$my_key"/>`. Any other fields are optional within task.
Depending on the object tag type, field values are interpreted differently:

- `<Text>`: value is taken as plain text
- `<Audio>`: value is taken as a valid URL to audio file
- `<AudioPlus>`: value is taken as a valid URL to an audio file with CORS policy enabled on the server side
- `<Image>`: is a valid URL to an image file


### Directory with JSON files

Instead of putting all tasks into one file, you can split your input data into several _tasks.json_, and specify the directory path. Each JSON file is formatted the same as above.

### CSV, TSV

When CSV/TSV formatted text file is used, column names are interpreted in the same manner as keys in JSON formatted file.


### Plain text file
In a common scenario, you may use only one input data stream (or in other words only one [object tag](/tags) specified in label config). In this case, you don't need to use JSON format, but simply write down your values in a plain text file, line by line, e.g.

```text
my_value_1
my_value_2
...
```
Values interpretation is the same as in [single JSON file](config.html#JSON-file) case


### Directory with text files

You can split your input data into several plain text files, and specify the directory path. Each plain text file is formatted the same as above.

### Directory with image files

You can point to a local directory, which is scanned recursively for image files. Each file is used to create one task. 

Supported formats are `.png, .jpg, .jpeg, .tiff, .bmp, .gif`

### Directory with audio files

You can point to a local directory, which is scanned recursively for image files. Each file is used to create one task. 

Supported formats are `.wav, .aiff, .mp3, .au, .flac`
   
## Export data

The output data is stored in _completions_ - JSON formatted files, one per each completed task saved in project directory in `completions` folder or in the [`"output_dir"` option](config.html#output_dir) The example structure of _completion_ is the following:

```json
{
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
    "data": {
        "image": "https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
    },
    "id": 1,
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
    ],
    "task_path": "../examples/image_bbox/tasks.json"
}
```

For popular machine learning libraries, there is a converter code to transform Label Studio format into an ML library format. [Learn More](/guide/converters.html)  about it.

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

Data copied from [input task](config.html#JSON-file)

### id

Task identifier

### predictions

Machine learning predictions (aka _pre-labeling results_)

### task_path

Path to local file from where the current task was taken
