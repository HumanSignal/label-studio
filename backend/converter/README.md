## Table of Contents

- [Introduction](#introduction)
- [Examples](#examples)
    - [Text Classification](#text-classification)
    - [Text Tagging](#text-tagging)
- [TODO](#todo)
- [Contributing](#contributing)

## Introduction

Label Studio Format Converter helps you to encode labels into the format of your favorite machine learning library.

## Examples

#### JSON
Run
```bash
python backend/converter/cli.py --input examples/sentiment_analysis/completions/ --config examples/sentiment_analysis/config.xml --output tmp/output.json
```

Get output file: `tmp/output.json`
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

Use cases: TBD


#### CSV
Run
```bash
python backend/converter/cli.py --input examples/sentiment_analysis/completions/ --config examples/sentiment_analysis/config.xml --output tmp/output.tsv --format CSV --csv-separator $'\t'
```

Get output file `tmp/output.tsv`:
```tsv
reviewText	sentiment
Good case, Excellent value.	Positive
What a waste of money and time!	Negative
The goose neck needs a little coaxing	Neutral
```

Use cases: TBD

#### CoNLL 2003

Run
```bash
python backend/converter/cli.py --input examples/named_entity/completions/ --config examples/named_entity/config.xml --output tmp/output.conll --format CONLL2003
```

Get output file `tmp/output.conll`
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

Use cases: TBD


## Contributing

We would love to get your help for creating converters to other models. Please feel free to create pull requests.

- [Contributing Guideline](/CONTRIBUTING.md)
- [Code Of Conduct](/CODE_OF_CONDUCT.md)
