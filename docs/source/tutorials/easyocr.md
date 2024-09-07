---
title: Transcribe text from images with EasyOCR
type: guide
tier: all
order: 40
hide_menu: true
hide_frontmatter_title: true
meta_title: EasyOCR model connection for transcribing text in images
meta_description: The EasyOCR model connection integrates the capabilities of EasyOCR with Label Studio to assist in machine learning labeling tasks involving Optical Character Recognition (OCR).
categories:
    - Computer Vision
    - Optical Character Recognition
    - EasyOCR
image: "/tutorials/easyocr.png"
---

<!--

-->

# EasyOCR model connection

The [EasyOCR](https://github.com/JaidedAI/EasyOCR) model connection is a powerful tool that integrates the capabilities of EasyOCR with Label Studio. It is designed to assist in machine learning labeling tasks, specifically those involving Optical Character Recognition (OCR). 

The primary function of this connection is to recognize and extract text from images, which can be a crucial step in many machine learning workflows. By automating this process, the EasyOCR model connection can significantly increase efficiency, reducing the time and effort required for manual text extraction.

In the context of Label Studio, this connection enhances the platform's labeling capabilities, allowing users to automatically generate labels for text in images. This can be particularly useful in tasks such as data annotation, document digitization, and more.

## Labeling configuration

The EasyOCR model connection can be used with the default labeling configuration for OCR in Label Studio. This configuration typically involves defining the types of labels to be used (e.g., text, handwriting, etc.) and the regions of the image where these labels should be applied.

When setting the labeling configuration, select the **Computer Vision > Optical Character Recognition**. This template is pre-configured for OCR tasks and includes the necessary elements for labeling text in images:

```xml
<View>
  <Image name="image" value="$image"/>

  <Labels name="label" toName="image">
    <Label value="Text" background="green"/>
    <Label value="Handwriting" background="blue"/>
  </Labels>

  <Rectangle name="bbox" toName="image" strokeWidth="3"/>
  <Polygon name="poly" toName="image" strokeWidth="3"/>

  <TextArea name="transcription" toName="image"
            editable="true"
            perRegion="true"
            required="true"
            maxSubmissions="1"
            rows="5"
            placeholder="Recognized Text"
            displayMode="region-list"
            />
</View>
```


> Warning! Please note that the current implementation of the EasyOCR model connection does not support images that are directly uploaded to Label Studio. It is designed to work with images that are hosted publicly on the internet. Therefore, to use this connection, you should ensure that your images are publicly accessible via a URL.


## Running with Docker (recommended)

1. Start the Machine Learning backend on `http://localhost:9090` with the prebuilt image:

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
label-studio-ml start ./easyocr
```

The EasyOCR model connection offers several configuration options that can be set in the `docker-compose.yml` file:

- `BASIC_AUTH_USER`: Specifies the basic auth user for the model server.
- `BASIC_AUTH_PASS`: Specifies the basic auth password for the model server.
- `LOG_LEVEL`: Sets the log level for the model server.
- `WORKERS`: Specifies the number of workers for the model server.
- `THREADS`: Specifies the number of threads for the model server.
- `MODEL_DIR`: Specifies the model directory.
- `LANG_LIST`: Specifies the list of languages to be used by the OCR model, separated by commas (default: `mn,en`). 
- `SCORE_THRESHOLD`: Sets the score threshold to filter out noisy results.
- `LABEL_MAPPINGS_FILE`: Specifies the file with mappings from COCO labels to custom labels.
- `DEVICE`: Specifies the device to be used (cpu, cuda:0, cuda:1, etc.).
- `HEIGHT_THS`: Sets the maximum difference in box height. Boxes with very different text size should not be merged.
- `LABEL_STUDIO_ACCESS_TOKEN`: Specifies the Label Studio access token.
- `LABEL_STUDIO_HOST`: Specifies the Label Studio host.

These options allow you to customize the behavior of the EasyOCR model connection to suit your specific needs.

# Customization

The ML backend can be customized by adding your own models and logic inside the `./easyocr` directory.