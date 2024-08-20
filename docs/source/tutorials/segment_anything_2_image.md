---
title: SAM2 with Images
type: guide
tier: all
order: 15
hide_menu: true
hide_frontmatter_title: true
meta_title: Using SAM2 with Label Studio for Image Annotation
categories:
    - Computer Vision
    - Image Annotation
    - Object Detection
    - Segment Anything Model
image: "/tutorials/sam2-images.png"
---

<!--

-->

# Using SAM2 with Label Studio for Image Annotation

Segment Anything 2, or SAM 2, is a model released by Meta in July 2024. An update to the original Segment Anything Model, 
SAM 2 provides even better object segmentation for both images and video. In this guide, we'll show you how to use 
SAM 2 for better image labeling with label studio. 

Click on the image below to watch our ML Evangelist Micaela Kaplan explain how to link SAM 2 to your Label Studio Project.
You'll need to follow the instructions below to stand up an instance of SAM2 before you can link your model! 


[![Connecting SAM2 Model to Label Studio for Image Annotation ](https://img.youtube.com/vi/FTg8P8z4RgY/0.jpg)](https://www.youtube.com/watch?v=FTg8P8z4RgY)

Note that as of 8/1/2024, SAM2 only runs on GPU.

## Running from source

1. To run the ML backend without Docker, you have to clone the repository and install all dependencies using pip:

```bash
git clone https://github.com/HumanSignal/label-studio-ml-backend.git
cd label-studio-ml-backend
pip install -e .
cd label_studio_ml/examples/segment_anything_2_image
pip install -r requirements.txt
```

2. Download [`segment-anything-2` repo](https://github.com/facebookresearch/segment-anything-2) into the root directory. Install SegmentAnything model and download checkpoints using [the official Meta documentation](https://github.com/facebookresearch/segment-anything-2?tab=readme-ov-file#installation)


3. Then you can start the ML backend on the default port `9090`:

```bash
cd ../
label-studio-ml start ./segment_anything_2_image
```

4. Connect running ML backend server to Label Studio: go to your project `Settings -> Machine Learning -> Add Model` and specify `http://localhost:9090` as a URL. Read more in the official [Label Studio documentation](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio).

## Running with Docker (coming soon)

1. Start Machine Learning backend on `http://localhost:9090` with prebuilt image:

```bash
docker-compose up
```

2. Validate that backend is running

```bash
$ curl http://localhost:9090/
{"status":"UP"}
```

3. Connect to the backend from Label Studio running on the same host: go to your project `Settings -> Machine Learning -> Add Model` and specify `http://localhost:9090` as a URL.


## Configuration
Parameters can be set in `docker-compose.yml` before running the container.


The following common parameters are available:
- `DEVICE` - specify the device for the model server (currently only `cuda` is supported, `cpu` is coming soon)
- `MODEL_CONFIG` - SAM2 model configuration file (`sam2_hiera_l.yaml` by default)
- `MODEL_CHECKPOINT` - SAM2 model checkpoint file (`sam2_hiera_large.pt` by default)
- `BASIC_AUTH_USER` - specify the basic auth user for the model server
- `BASIC_AUTH_PASS` - specify the basic auth password for the model server
- `LOG_LEVEL` - set the log level for the model server
- `WORKERS` - specify the number of workers for the model server
- `THREADS` - specify the number of threads for the model server

## Customization

The ML backend can be customized by adding your own models and logic inside the `./segment_anything_2` directory.