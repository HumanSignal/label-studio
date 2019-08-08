## Label studio converter

Converter helps to create data feed accepted by some popular repositories with machine learning models


#### Text classification

CSV / TSV
```bash
python text_classifier/csv.py -i directory/with/completions -o your/output/file.tsv
```


#### Text tagging

#####[guillaumegenthial/tf_ner](https://github.com/guillaumegenthial/tf_ner)
```bash
python text_tagging/tf_ner.py -i directory/with/completions -o your/output/directory
```

#####[Spacy CoNLL 2003](https://spacy.io/api/cli#convert)
```bash
python text_classifier/spacy_conll2003.py -i directory/with/completions -o your/output/directory
```
