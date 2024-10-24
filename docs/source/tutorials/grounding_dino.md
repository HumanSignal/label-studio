---
title: Zero-shot object detection and image segmentation with Grounding DINO
type: guide
tier: all
order: 15
hide_menu: true
hide_frontmatter_title: true
meta_title: Image segmentation in Label Studio using a Grounding DINO backend
meta_description: Label Studio tutorial for using Grounding DINO for zero-shot object detection in images
categories:
    - Computer Vision
    - Image Annotation
    - Object Detection
    - Grounding DINO
image: "/tutorials/grounding-dino.png"
---

https://github.com/HumanSignal/label-studio-ml-backend/assets/106922533/d1d2f233-d7c0-40ac-ba6f-368c3c01fd36


# Grounding DINO backend integration

This integration will allow you to:

* Use text prompts for zero-shot detection of objects in images.
* Specify the detection of any object and get state-of-the-art results without any model fine tuning.

See [here](https://github.com/IDEA-Research/GroundingDINO) for more details about the pre-trained Grounding DINO model. 

## Before you begin

Before you begin, you must install the [Label Studio ML backend](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#quickstart). 

This tutorial uses the [`grounding_dino` example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/grounding_dino). 


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
    <Style>
    .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }
    </Style>
    <View className="prompt">
        <Header value="Enter a prompt to detect objects in the image:"/>
    <TextArea name="prompt" toName="image" editable="true" rows="2" maxSubmissions="1" showSubmitButton="true"/>
    </View>
    <Image name="image" value="$image"/>

    <RectangleLabels name="label" toName="image">
        <Label value="cats" background="yellow"/>
        <Label value="house" background="blue"/>
    </RectangleLabels>
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

If you are looking for GroundingDINO integration with SAM, [check this example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/grounding_sam).