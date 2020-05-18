---
title: Machine learning backend
type: guide
order: 906
---

You can easily connect your favorite machine learning framework with Label Studio Machine Learning SDK. 

That gives you the opportunities to use:
- **Pre-labeling**: Use model predictions for pre-labeling (e.g. make use on-the-fly model predictions for creating rough image segmentations for further manual refinements)
- **Autolabeling**: Create automatic annotations
- **Online Learning**: Simultaneously update (retrain) your model while new annotations are coming
- **Active Learning**: Perform labeling in active learning mode - select only most complex examples
- **Prediction Service**: Instantly create running production-ready prediction service


## Tutorials

- [Create the simplest ML backend](/tutorials/dummy_model.html)
- [Text classification with Scikit-Learn](/tutorials/sklearn-text-classifier.html)
- [Transfer learning for images with PyTorch](/tutorials/pytorch-image-transfer-learning.html)

## Quickstart

Here is a quick example tutorial on how to run the ML backend with a simple text classifier:

0. Clone repo
   ```bash
   git clone https://github.com/heartexlabs/label-studio  
   ```
   
1. Setup environment
   ```bash
   cd label-studio
   pip install -e .
   cd label_studio/ml/examples
   pip install -r requirements.txt
   ```
   
2. Create new ML backend
   ```bash
   label-studio-ml init my_ml_backend --script label-studio/ml/examples/simple_text_classifier.py
   ```
   
3. Start ML backend server
   ```bash
   label-studio-ml start my_ml_backend
   ```
   
4. Run Label Studio connecting it to the running ML backend:
    ```bash
    label-studio start text_classification_project --init --template text_sentiment --ml-backend-url http://localhost:9090
    ```


## Create your own ML backend

Check examples in `label-studio/ml/examples` directory.