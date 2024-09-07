---
title: NER labeling with Flair 
type: guide
tier: all
order: 75
hide_menu: true
hide_frontmatter_title: true
meta_title: Use Flair with Label Studio
meta_description: Tutorial on how to use Label Studio and Flair for faster NER labeling 
categories:
    - Natural Language Processing
    - Named Entity Recognition
    - Flair
image: "/tutorials/flair.png"
---

<!--

-->

# Flair NER example

This example demonstrates how to use Flair NER model with Label Studio.

## Quickstart

1. Build and start the Machine Learning backend on `http://localhost:9090`

```bash
docker-compose up
```

2. Validate that the backend is running

```bash
$ curl http://localhost:9090/health
{"status":"UP"}
```

3. Create a project in Label Studio. Then from the **Model** page in the project settings, [connect the model](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio). The default URL is `http://localhost:9090`.

## Labeling Configuration

```xml
<View>
  <Labels name="label" toName="text">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>

  <Text name="text" value="$text"/>
</View>
```


## Parameters

- `FLAIR_MODEL_NAME`: The name of the Flair model to use. Default is `ner`. See all options [here](https://flairnlp.github.io/docs/tutorial-basics/tagging-entities#list-of-ner-models)