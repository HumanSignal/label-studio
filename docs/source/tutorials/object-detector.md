---
title:
type: blog
order: 40
---

## OpenMMLab Image object detector or MMDetection

This [Machine Learning backend](https://labelstud.io/guide/ml.html) allows you to automatically pre-annotate your images with bounding boxes. It's powered by the amazing [OpenMMLab MMDetection library](https://github.com/open-mmlab/mmdetection), which gives you access to many existing state-of-the-art models like FasterRCNN, RetinaNet, YOLO and others. 

Follow this installation guide and then play around with them, picking the best model that suits your current dataset!

## Start using it

1. [Install the model locally](#Installation).

2. Run Label Studio, then go to the **Machine Learning** page in the project settings. Paste the selected ML backend URL, then click **Add Model**.

3. On the **Labeling Interface** page, select the `COCO annotation` or `Bbox object detection` template. 
   Optionally, you can modify the label config with the `predicted_values` attribute. It provides a list of COCO labels separated by comma. If the object detector outputs any of these labels, they are translated to the actual label name from the `value` attribute.

    For example, if your labeling config contains the following:
    
    ```xml
    <Label value="Airplane" predicted_values="airplane"/>
    <Label value="Car" predicted_values="car,truck"/>
    ```
   For a specific task, the following occurs:
    - If the COCO object detector predicts a bbox with label `"airplane"`, you see the label `"Airplane"`.
    - if it predicts `"car"` or `"truck"`, either of those predictions are squashed to show the `"Car"` label on the task.

See [the full list of COCO labels](#The-full-list-of-COCO-labels) for reference.


## Installation

1. Set up the MMDetection environment following [the MMDetection installation guide](https://mmdetection.readthedocs.io/en/v1.2.0/INSTALL.html). Depending on your OS, some dependencies might be missed, such as gcc-c++, mesa-libGL. Install them using your package manager.

2. Create and initialize the directory `./coco-detector`:

    ```bash
    label-studio-ml init coco-detector --from label_studio_ml/examples/mmdetection/mmdetection.py
    ```

3. Download the `config_file` and `checkpoint_file` from MMDetection model zoo (use the [recommended Faster RCNN for a quickstart](https://mmdetection.readthedocs.io/en/latest/1_exist_data_model.html#inference-with-existing-models)). Place the `config_file` within the cloned [mmdetection repo](https://github.com/open-mmlab/mmdetection).

Depending on your specific use case, there are different settings for how to run this ML backend:

## Run ML backend on the same machine as Label Studio

If you run the ML backend on the same machine as Label Studio, you can upload images directly to Label Studio or specify them as remote URLs. 

#### Images are uploaded in Label Studio UI
   ```bash
   label-studio-ml start coco-detector --with \
   config_file=mmdetection/configs/faster_rcnn/faster_rcnn_r50_fpn_1x_coco.py \
   checkpoint_file=/absolute/path/to/downloaded/checkpoint.pth
   ```
In this case, the ML backend reads images from the default data upload folder.
If you change the default upload folder, for example by setting `LABEL_STUDIO_BASE_DATA_DIR=/custom/data/path`, you must explicitly specify the upload folder:

   ```bash
   label-studio-ml start coco-detector --with \
   config_file=mmdetection/configs/faster_rcnn/faster_rcnn_r50_fpn_1x_coco.py \
   checkpoint_file=/absolute/path/to/downloaded/checkpoint.pth \
   image_dir=/custom/data/path/media/upload
   ```

#### Images are specified as remote URLs

   ```bash
   label-studio-ml start coco-detector --with \
   config_file=mmdetection/configs/faster_rcnn/faster_rcnn_r50_fpn_1x_coco.py \
   checkpoint_file=/absolute/path/to/downloaded/checkpoint.pth
   ```

## Run ML backend server on the different machine as Label Studio

When running the ML backend on a separate server instance and connecting it to Label Studio with a remote hostname URL, you must remember that your ML backend server must get the full image URLs.
In this case, you must provide the Label Studio hostname before running ML backend:

   ```bash
   LABEL_STUDIO_HOSTNAME=http://my.label-studio.com:8080 label-studio-ml start coco-detector --with \
   config_file=mmdetection/configs/faster_rcnn/faster_rcnn_r50_fpn_1x_coco.py \
   checkpoint_file=/absolute/path/to/downloaded/checkpoint.pth
   ```

## Other parameters

You can also specify other parameters when you start this ML backend to fit your use case or environment.

#### GPU support
If you have a GPU available, you can specify that with `device=gpu:0` when you start the ML backend to significantly speed up pre-annotation of images. For example:

 ```bash
   label-studio-ml start coco-detector --with \
   config_file=mmdetection/configs/faster_rcnn/faster_rcnn_r50_fpn_1x_coco.py \
   checkpoint_file=/absolute/path/to/downloaded/checkpoint.pth \
   device=gpu:0
   ```

#### Bounding box thresholding

You can also tune the `score_threshold`. Lower values increase sensitivity but produce more noise.

   ```bash
   label-studio-ml start coco-detector --with \
   config_file=mmdetection/configs/faster_rcnn/faster_rcnn_r50_fpn_1x_coco.py \
   checkpoint_file=/absolute/path/to/downloaded/checkpoint.pth \
   score_threshold=0.5
   ```
     

## The full list of COCO labels
```text
airplane
apple
backpack
banana
baseball_bat
baseball_glove
bear
bed
bench
bicycle
bird
boat
book
bottle
bowl
broccoli
bus
cake
car
carrot
cat
cell_phone
chair
clock
couch
cow
cup
dining_table
dog
donut
elephant
fire_hydrant
fork
frisbee
giraffe
hair_drier
handbag
horse
hot_dog
keyboard
kite
knife
laptop
microwave
motorcycle
mouse
orange
oven
parking_meter
person
pizza
potted_plant
refrigerator
remote
sandwich
scissors
sheep
sink
skateboard
skis
snowboard
spoon
sports_ball
stop_sign
suitcase
surfboard
teddy_bear
tennis_racket
tie
toaster
toilet
toothbrush
traffic_light
train
truck
tv
umbrella
vase
wine_glass
zebra
```
