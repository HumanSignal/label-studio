---
title: spaCy models for NER 
type: guide
tier: all
order: 70
hide_menu: true
hide_frontmatter_title: true
meta_title: Use spaCy models with Label Studio
meta_description: Tutorial on how to use Label Studio and spaCy for faster NER and POS labeling 
categories:
    - Natural Language Processing
    - Named Entity Recognition
    - SpaCy
image: "/tutorials/spacy.png"
---

This ML backend provides a simple way to use [spaCy](https://spacy.io/) models for Named Entity Recognition (NER) and Part-of-Speech (POS) tagging.

Current implementation includes the following models:
- Named Entity Recognition (NER)
- [coming soon...] Part-of-Speech (POS) tagging

## Before you begin

Before you begin, you must install the [Label Studio ML backend](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#quickstart). 

This tutorial uses the [`spacy` example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/spacy). 

## Quickstart

1. Build and start the ML backend on `http://localhost:9090`

```bash
docker-compose up
```

2. Validate that the backend is running

```bash
$ curl http://localhost:9090/health
{"status":"UP"}
```

3. Create a project in Label Studio. Then from the **Model** page in the project settings, [connect the model](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio). The default URL is `http://localhost:9090`.

## Usage

### Labeling configuration

This model is compatible with the following labeling configurations:
```xml
<View>
    <Labels name="label" toName="text">
        <Label value="CARDINAL" background="#FFA39E"/>
        <Label value="DATE" background="#D4380D"/>
        <Label value="EVENT" background="#FFC069"/>
        <Label value="FAC" background="#AD8B00"/>
        <Label value="GPE" background="#D3F261"/>
        <Label value="LANGUAGE" background="#389E0D"/>
        <Label value="LAW" background="#5CDBD3"/>
        <Label value="LOC" background="#096DD9"/>
        <Label value="ORG" background="#ADC6FF"/>
        <Label value="PERSON" background="#9254DE"/>
        <Label value="TIME" background="#F759AB"/>
    </Labels>
    <Text name="text" value="$text"/>
</View>
```

You can also use the default configuration from the [Named Entity Recognition template](https://labelstud.io/templates/named_entity) provided with Label Studio.

> Note: If your labels are different from the default ones, the text spans will still be highlighted, but you have to manually map the labels to the ones you have in the model. Go to `model.py` and change `_custom_labels_mapping` to map from SpaCy entities to your labels. Check for predefined labels in the official SpaCy documentation, for example for [en_core_web_sm](https://spacy.io/models/en#en_core_web_sm).

## Parameters
To change default parameters, specify the following environment variables:

- `PORT` - port to run the server on, default is `9090`
- `WORKERS` - number of workers to run the server with, default is `2`
- `SPACY_MODEL` - spaCy model to use, default is `en_core_web_sm`