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

### Text Classification

CSV / TSV
```bash
python text_classifier/csv.py -i directory/with/completions -o your/output/file.tsv
```

### Text Tagging

##### [guillaumegenthial/tf_ner](https://github.com/guillaumegenthial/tf_ner)

```bash
python text_tagging/tf_ner.py -i directory/with/completions -o your/output/directory
```

##### [Spacy CoNLL 2003](https://spacy.io/api/cli#convert)

```bash
python text_classifier/spacy_conll2003.py -i directory/with/completions -o your/output/directory
```

## TODO

- List of libraries TBD

## Contributing

We would love to get your help for creating converters to other models. Please feel free to create pull requests.

- [Contributing Guideline](/CONTRIBUTING.md)
- [Code Of Conduct](/CODE_OF_CONDUCT.md)
