## Table of Contents

- [Introduction](#introduction)
- [Examples](#examples)
    - [JSON](#json)
    - [CSV](#csv)
    - [CoNLL 2003](#conll-2003)
    - [COCO](#coco)
    - [Pascal VOC XML](#pascal-voc-xml)
- [Contributing](#contributing)

## Introduction

Label Studio Format Converter helps you to encode labels into the format of your favorite machine learning library.

## Examples

#### JSON
Running from the command line:
```bash
python backend/converter/cli.py --input examples/sentiment_analysis/completions/ --config examples/sentiment_analysis/config.xml --output tmp/output.json
```

Running from python:
```python
from converter import Converter

c = Converter('examples/sentiment_analysis/config.xml')
c.convert_to_json('examples/sentiment_analysis/completions/', 'tmp/output.json')
```

Getting output file: `tmp/output.json`
```json
[
  {
    "reviewText": "Good case, Excellent value.",
    "sentiment": "Positive"
  },
  {
    "reviewText": "What a waste of money and time!",
    "sentiment": "Negative"
  },
  {
    "reviewText": "The goose neck needs a little coaxing",
    "sentiment": "Neutral"
  }
]
```

Use cases: any tasks


#### CSV
Running from the command line:
```bash
python backend/converter/cli.py --input examples/sentiment_analysis/completions/ --config examples/sentiment_analysis/config.xml --output tmp/output.tsv --format CSV --csv-separator $'\t'
```

Running from python:
```python
from converter import Converter

c = Converter('examples/sentiment_analysis/config.xml')
c.convert_to_csv('examples/sentiment_analysis/completions/', 'tmp/output.tsv', sep='\t', header=True)
```

Getting output file `tmp/output.tsv`:
```tsv
reviewText	sentiment
Good case, Excellent value.	Positive
What a waste of money and time!	Negative
The goose neck needs a little coaxing	Neutral
```

Use cases: any tasks

#### CoNLL 2003

Running from the command line:
```bash
python backend/converter/cli.py --input examples/named_entity/completions/ --config examples/named_entity/config.xml --output tmp/output.conll --format CONLL2003
```

Running from python:
```python
from converter import Converter

c = Converter('examples/named_entity/config.xml')
c.convert_to_conll2003('examples/named_entity/completions/', 'tmp/output.conll')
```

Getting output file `tmp/output.conll`
```text
-DOCSTART- -X- O
Showers -X- _ O
continued -X- _ O
throughout -X- _ O
the -X- _ O
week -X- _ O
in -X- _ O
the -X- _ O
Bahia -X- _ B-Location
cocoa -X- _ O
zone, -X- _ O
...
```

Use cases: text tagging


#### COCO
Running from the command line:
```bash
python backend/converter/cli.py --input examples/image_bbox/completions/ --config examples/image_bbox/config.xml --output tmp/output.json --format COCO --image-dir tmp/images
```

Running from python:
```python
from converter import Converter

c = Converter('examples/image_bbox/config.xml')
c.convert_to_coco('examples/image_bbox/completions/', 'tmp/output.conll', output_image_dir='tmp/images')
```

Output images could be found in `tmp/images`

Getting output file `tmp/output.json`
```json
{
  "images": [
    {
      "width": 800,
      "height": 501,
      "id": 0,
      "file_name": "tmp/images/62a623a0d3cef27a51d3689865e7b08a"
    }
  ],
  "categories": [
    {
      "id": 0,
      "name": "Planet"
    },
    {
      "id": 1,
      "name": "Moonwalker"
    }
  ],
  "annotations": [
    {
      "id": 0,
      "image_id": 0,
      "category_id": 0,
      "segmentation": [],
      "bbox": [
        299,
        6,
        377,
        260
      ],
      "ignore": 0,
      "iscrowd": 0,
      "area": 98020
    },
    {
      "id": 1,
      "image_id": 0,
      "category_id": 1,
      "segmentation": [],
      "bbox": [
        288,
        300,
        132,
        90
      ],
      "ignore": 0,
      "iscrowd": 0,
      "area": 11880
    }
  ],
  "info": {
    "year": 2019,
    "version": "1.0",
    "contributor": "Label Studio"
  }
}
```

Use cases: image object detection

#### Pascal VOC XML
Running from the command line:
```bash
python backend/converter/cli.py --input examples/image_bbox/completions/ --config examples/image_bbox/config.xml --output tmp/voc-annotations --format VOC --image-dir tmp/images
```

Running from python:
```python
from converter import Converter

c = Converter('examples/image_bbox/config.xml')
c.convert_to_voc('examples/image_bbox/completions/', 'tmp/output.conll', output_image_dir='tmp/images')
```

Output images can be found in `tmp/images`

Corresponding annotations could be found in `tmp/voc-annotations/*.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<annotation>
<folder>tmp/images</folder>
<filename>62a623a0d3cef27a51d3689865e7b08a</filename>
<source>
<database>MyDatabase</database>
<annotation>COCO2017</annotation>
<image>flickr</image>
<flickrid>NULL</flickrid>
</source>
<owner>
<flickrid>NULL</flickrid>
<name>Label Studio</name>
</owner>
<size>
<width>800</width>
<height>501</height>
<depth>3</depth>
</size>
<segmented>0</segmented>
<object>
<name>Planet</name>
<pose>Unspecified</pose>
<truncated>0</truncated>
<difficult>0</difficult>
<bndbox>
<xmin>299</xmin>
<ymin>6</ymin>
<xmax>676</xmax>
<ymax>266</ymax>
</bndbox>
</object>
<object>
<name>Moonwalker</name>
<pose>Unspecified</pose>
<truncated>0</truncated>
<difficult>0</difficult>
<bndbox>
<xmin>288</xmin>
<ymin>300</ymin>
<xmax>420</xmax>
<ymax>390</ymax>
</bndbox>
</object>
</annotation>
```

Use cases: image object detection


## Contributing

We would love to get your help for creating converters to other models. Please feel free to create pull requests.

- [Contributing Guideline](/CONTRIBUTING.md)
- [Code Of Conduct](/CODE_OF_CONDUCT.md)
