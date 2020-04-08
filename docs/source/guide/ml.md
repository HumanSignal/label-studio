---
title: Machine learning backend
type: guide
order: 906
---

You can easily connect your favorite machine learning framework with Label Studio by using [Heartex SDK](https://github.com/heartexlabs/pyheartex). 

That gives you the opportunities to use:
- **Pre-labeling**: Use model predictions for pre-labeling
- **Online Learning**: Simultaneously update (retrain) your model while new annotations are coming
- **Active Learning**: Perform labeling in active learning mode
- **Prediction Service**: Instantly create running production-ready prediction service


## Tutorials

- [Create the simplest ML backend](/tutorials/dummy_model.html)
- [Text classification with Scikit-Learn](/tutorials/sklearn-text-classifier.html)
- [Transfer learning for images with PyTorch](/tutorials/pytorch-image-transfer-learning.html)

## Quickstart

Here is a quick example tutorial on how to do that with simple text classification:

0. Clone repo
   ```bash
   git clone https://github.com/heartexlabs/label-studio  
   ```
   
1. Create new ML backend
   ```bash
   label-studio-ml init my_ml_backend --script label-studio/ml/examples/simple_text_classifier.py
   ```
   
2. Start ML backend server
   ```bash
   label-studio-ml start my_ml_backend
   ```
   
3. Run Label Studio connecting it to the running ML backend:
    ```bash
    label-studio start text_classification_project --init --template text_sentiment --ml-backend-url http://localhost:9090
    ```

## Create your own ML backend

Check examples in `label-studio/ml/examples` directory.