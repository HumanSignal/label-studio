---
title: Use GLiNER for NER annotation
type: guide
tier: all
order: 37
hide_menu: true
hide_frontmatter_title: true
meta_title: Use GLiNER for NER annotation
meta_description: Tutorial on how to use GLiNER with your Label Studio project to complete NER tasks
categories:
    - Natural Language Processing
    - Named Entity Recognition
    - GLiNER
    - BERT
    - Hugging Face
image: "/tutorials/gliner.png"
---

# Use GLiNER for NER annotation

The GLiNER model is a BERT family model for generalist NER. We download the model from HuggingFace, but the original
model is
available on [GitHub](https://github.com/urchade/GLiNER).

## Before you begin

Before you begin, you must install the [Label Studio ML backend](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#quickstart). 

This tutorial uses the [`gliner` example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/gliner). 


## Running with Docker (recommended)

1. Start Machine Learning backend on `http://localhost:9090` with prebuilt image:

```bash
docker-compose up
```

2. Validate that backend is running

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
label-studio-ml start ./dir_with_your_model
```

## Configuration

Parameters can be set in `docker-compose.yml` before running the container.

The following common parameters are available:
- `BASIC_AUTH_USER` - Specify the basic auth user for the model server.
- `BASIC_AUTH_PASS` - Specify the basic auth password for the model server.
- `LOG_LEVEL` - Set the log level for the model server.
- `WORKERS` - Specify the number of workers for the model server.
- `THREADS` - Specify the number of threads for the model server.
- `LABEL_STUDIO_URL` - Specify the URL of your Label Studio instance. Note that this might need to be `http://host.docker.internal:8080` if you are running Label Studio on another Docker container.
- `LABEL_STUDIO_API_KEY`- Specify the API key for authenticating your Label Studio instance. You can find this by logging into Label Studio and and [going to the **Account & Settings** page](https://labelstud.io/guide/user_account#Access-token).