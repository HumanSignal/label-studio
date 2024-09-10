---
title: Zero-shot object detection and image segmentation with Grounding DINO and SAM
type: guide
tier: all
order: 15
hide_menu: true
hide_frontmatter_title: true
meta_title: Image segmentation in Label Studio using a Grounding DINO backend and SAM
meta_description: Label Studio tutorial for using Grounding DINO and SAM for zero-shot object detection in images
categories:
    - Computer Vision
    - Image Annotation
    - Object Detection
    - Zero-shot Image Segmentation
    - Grounding DINO
    - Segment Anything Model
image: "/tutorials/grounding-sam.png"
---

https://github.com/HumanSignal/label-studio-ml-backend/assets/106922533/d1d2f233-d7c0-40ac-ba6f-368c3c01fd36


# Grounding DINO backend integration with SAM enabled

This integration will allow you to:

* Use text prompts for zero-shot detection of objects in images.
* Specify the detection of any object and get state-of-the-art results without any model fine tuning.
* Get segmentation predictions from SAM with just text prompts.

See [here](https://github.com/IDEA-Research/GroundingDINO) for more details about the pre-trained Grounding DINO model. 

## Before you begin

Before you begin, you must install the [Label Studio ML backend](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#quickstart). 

This tutorial uses the [`grounding_sam` example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/grounding_sam). 


## Quickstart

1. Make sure Docker is installed.
2. Edit `docker-compose.yml` to include the following:
   * `LABEL_STUDIO_HOST` sets the endpoint of the Label Studio host. Must begin with `http://` 
   * `LABEL_STUDIO_ACCESS_TOKEN` sets the API access token for the Label Studio host. This can be found by logging
  into Label Studio and [going to the **Account & Settings** page](https://labelstud.io/guide/user_account#Access-token). 

    Example:
   - `LABEL_STUDIO_HOST=http://123.456.7.8:8080`
   - `LABEL_STUDIO_ACCESS_TOKEN=your-api-key`

3. Run `docker compose up`
4. Check the IP of your backend using `docker ps`. You will use this URL when connecting the backend to a Label Studio project. Usually this is `http://localhost:9090`.

5. Create a project and edit the labeling config (an example is provided below). When editing the labeling config, make sure to add all rectangle labels under the `RectangleLabels` tag, and all corresponding brush labels under the `BrushLabels` tag.

```xml
<View>
  <Image name="image" value="$image"/>
  <Style>
    .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }
  </Style>
  <View className="prompt">
  <TextArea name="prompt" toName="image" editable="true" rows="2" maxSubmissions="1" showSubmitButton="true"/>
  </View>
  <RectangleLabels name="label" toName="image">
    <Label value="cats" background="yellow"/>
    <Label value="house" background="blue"/>
  </RectangleLabels>
  <BrushLabels name="label2" toName="image">
    <Label value="cats" background="yellow"/>
    <Label value="house" background="blue"/>
  </BrushLabels>
</View>
```

6. From the **Model** page in the project settings, [connect the model](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio). 
7. Go to an image task in your project. Enable **Auto-annotation** (found at the bottom of the labeling interface). Then enter in the prompt box and press **Add**. After this, you should receive your predictions. See the video above for a demo. 


## Using GPU

For the best user experience, it is recommended to use a GPU. To do this, you can update the `docker-compose.yml` file including the following lines:

```yaml
environment:
  - NVIDIA_VISIBLE_DEVICES=all
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

## Using GroundingSAM

Combine the Segment Anything Model with your text input to automatically generate mask predictions! 

To do this, set `USE_SAM=true` before running. 

> Warning: Using GroundingSAM without a GPU may result in slow performance and is not recommended. If you must use a CPU-only machine, and experience slow performance or don't see any predictions on the labeling screen, consider one of the following:
> - Increase memory allocated to the Docker container (e.g. `memory: 16G` in `docker-compose.yml`)
> - Increase the prediction timeout on Label Studio instance with the `ML_TIMEOUT_PREDICT=100` environment variable.
> - Use "MobileSAM" as a lightweight alternative to "SAM".

If you want to use a [more efficient version of SAM](https://github.com/ChaoningZhang/MobileSAM), set `USE_MOBILE_SAM=true`.


## Batching inputs

https://github.com/HumanSignal/label-studio-ml-backend/assets/106922533/79b788e3-9147-47c0-90db-0404066ee43f

> Note: This is an experimental feature.

1. Clone the Label Studio feature branch that includes the experimental batching functionality.

    `git clone -b feature/dino-support https://github.com/HumanSignal/label-studio.git`

2. Run this branch with `docker compose up`
3. Do steps 2-5 from the [quickstart section](#quickstart), now using access code and host IP info of the newly cloned Label Studio branch. GroundingSAM is supported.
4. Go to the Data Manager in your project and select the tasks you would like to annotate.
5. Select **Actions > Add Text Prompt for GroundingDINO**.
6. Enter the prompt you would like to retrieve predictions for and click **Submit**.

> Note: If your prompt is different from the label values you have assigned, you can use the underscore to give the correct label values to your prompt outputs. For example, if you wanted to select all brown cats but still give them the label value "cats" from your labeling config, your prompt would be "brown cat_cats".


## Other environment variables

Adjust `BOX_THRESHOLD` and `TEXT_THRESHOLD` values in the Dockerfile to a number between 0 to 1 if experimenting. Defaults are set in `dino.py`. For more information about these values, [click here](https://github.com/IDEA-Research/GroundingDINO#star-explanationstips-for-grounding-dino-inputs-and-outputs).

If you want to use SAM models saved from either directories, you can use the `MOBILESAM_CHECKPOINT` and `SAM_CHECKPOINT` as shown in the Dockerfile.