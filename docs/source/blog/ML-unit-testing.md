---
title: Machine Learning Unit Testing with Label Studio
type: blog
order: 96
meta_title: Machine Learning Unit Testing with Label Studio
meta_description: Machine Learning Unit Testing with Label Studio 
---

## CI Pipeline

1. Annotate images in Label Studio and export ground truth results into `tasks.json`
2. Run object detection model on ground truth images
3. Store prediction results in Label Studio JSON format in `test_tasks.json`
4. Run unit tests with LS JSON by comparing each prediction with each ground truth annotation
5. Repeat from 2 when the new model version comes

First set initial set of CI parameters:
```python
MODEL = 'COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml'
MATCHING_SCORE_THRESHOLD = 0.9
```

Define model reader:

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

## Getting result from object detector

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

## Run unit tests

```python
import pytest
from label_studio_evalme import matching_score

@pytest.mark.parametrize('test_task', json.load(open('test_tasks.json')))
def test_suite(test_task):
    assert matching_score(test_task['annotation'], test_task['prediction']) > MATCHING_SCORE_THRESHOLD
```

## Create Github Actions CI Workflow

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
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.7

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run model
        run: python run_model.py

      - name: Run unit tests
        run: pytest
```