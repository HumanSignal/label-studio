---
title: Machine Learning Unit Testing with Label Studio
type: blog
order: 96
meta_title: Machine Learning Unit Testing with Label Studio
meta_description: Machine Learning Unit Testing with Label Studio 
---


## Overview

Label Studio tool lets you write no-code unit tests for your ML models.

## How it works
<img src="/images/ML-unit-test-scheme.png" alt="Decorative graphic." class="gif-border" />


1. Create Ground Truth annotations with Label Studio

2. Get ML model predictions

3. Trigger CI step to evaluate model predictions on Ground Truth annotations

## Create Ground truth annotations

Upload test images, annotate them then export in raw JSON format.

## Get ML model predictions

Assume you can get raw output tensors from your model predictions. The crucial step here is to convert these tensor into Label Studio predictions.
You can do it manually by following [Label Studio guide]() or applying converter utility:

```python
predictions = BboxConverter(bboxes).from_task(task)
```

#### Example

Get Detectron2 model

```python
from detectron2 import model_zoo
from detectron2.engine import DefaultPredictor
from detectron2.config import get_cfg

def get_model():
    cfg = get_cfg()
    # add project-specific config (e.g., TensorMask) here if you're not running a model in detectron2's core library
    cfg.merge_from_file(model_zoo.get_config_file(MODEL))
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = 0.5  # set threshold for this model
    # Find a model from detectron2's model zoo. You can use the https://dl.fbaipublicfiles... url as well
    cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url(MODEL)
    return DefaultPredictor(cfg)
```

Then run object detector inference to produce `test_tasks.json` input for the next step

```python
import cv2
import json
from label_studio_converter import BboxConverter

def run_model():
    # taken from https://colab.research.google.com/drive/16jcaJoc6bCFAQ96jDe2HwtXj7BMD_-m5#scrollTo=Vk4gID50K03a
    model = get_model()
    # get tasks with annotations from Label Studio export
    tasks = json.load(open('tasks.json'))
    for task in tasks:
        image_path = task['data']['image']
        image = cv2.imread(image_path)
        outputs = model(image)
        bboxes = outputs['instances'].pred_boxes.cpu().detach().numpy()
        # create Label Studio predictions
        predictions = BboxConverter(bboxes).from_task(task)
        task['predictions'] = predictions

    # Save tasks with predictions for ML unit testing
    with open('test_tasks.json', mode='w') as fout:
        json.dump(tasks, fout)
```

## Run ML unit tests with Github Action

Add the following step to your [Github Action workflow]()

```yaml
  - name: Run Label Studio ML Unit tests
    uses: heartexlabs/label-studio-ml-test@master
    with:
      test-data: test_tasks.json
```


#### Example

```yaml
name: ml-unit-test-example
on:
  push:
    branches: ['*', '*/*', master]

jobs:
  detectron2_unit_test:
    name: ML Unit Test with Detectron2
    runs-on: ubuntu-latest

    steps:
      # first your steps to get ML assets...

      - name: Run Label Studio ML Unit tests
        uses: heartexlabs/label-studio-ml-test@master
        with:
          test-data: test_tasks.json
```

## Run ML unit tests manually

If you don't want to rely on Github actions infrastructure, you can trigger Label Studio ML unit tests manually from any python environment.

Install repo:

```bash
git clone https://github.com/heartexlabs/label-studio-ml-test
cd label-studio-ml-test
pip install -r requirements.txt
```

Then copy prepared `test_tasks.json` in into repo and run:

```bash
pytest --test-data test_tasks.json
```