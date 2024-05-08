---
title: Interactive substring matching for NER tasks
type: guide
tier: all
order: 30
hide_menu: true
hide_frontmatter_title: true
meta_title: Interactive substring matching for NER tasks
meta_description: Use the interactive substring matching model for labeling NER tasks in Label Studio
categories:
    - Natural Language Processing
    - Named Entity Recognition
    - Interactive matching
image: "/tutorials/interactive-substring-matching.png"
---

<!--

-->

# Interactive substring matching

The Machine Learning (ML) backend is designed to enhance the efficiency of auto-labeling in Named Entity Recognition (NER) tasks. It achieves this by selecting a keyword and automatically matching the same keyword in the provided text. 

## Recommended labeling config

This ML backend works with the default NER template from Label Studio. You can find this by selecting Label Studio's pre-built NER template when configuring the labeling interface. It is available under **Natural Language Processing > Named Entity Recognition**.

Here is an example of a labeling configuration that can be used with this ML backend:

```xml
<View>
  <Labels name="label" toName="text">
    <Label value="ORG" background="orange" />
    <Label value="PER" background="lightgreen" />
    <Label value="LOC" background="lightblue" />
    <Label value="MISC" background="lightgray" />
  </Labels>
  <Text name="text" value="$text" />
</View>
```

## Running with Docker (recommended)

1. Start the Machine Learning backend on `http://localhost:9090` with prebuilt image:

```bash
docker-compose up
```

2. Validate that the backend is running

```bash
$ curl http://localhost:9090/
{"status":"UP"}
```

3. Create a project in Label Studio. Then from the **Model** page in the project settings, [connect the model](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio). The default URL is `http://localhost:9090`.


## Building from source (advanced)

To build the ML backend from source, you have to clone the repository and build the Docker image:

```bash
docker-compose build
```

## Running without Docker (advanced)

To run the ML backend without Docker, you have to clone the repository and install all dependencies using pip:

```bash
python -m venv ml-backend
source ml-backend/bin/activate
pip install -r requirements.txt
```

Then you can start the ML backend:

```bash
label-studio-ml start ./interactive_substring_matching
```

## Configuration

Parameters can be set in `docker-compose.yml` before running the container.

The following common parameters are available:
- `BASIC_AUTH_USER` - Specify the basic auth user for the model server
- `BASIC_AUTH_PASS` - Specify the basic auth password for the model server
- `LOG_LEVEL` - Set the log level for the model server
- `WORKERS` - Specify the number of workers for the model server
- `THREADS` - Specify the number of threads for the model server

## Customization

The ML backend can be customized by adding your own models and logic inside the `./interactive_substring_matching` directory.