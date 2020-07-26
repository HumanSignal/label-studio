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
   label-studio-ml init my_ml_backend --script label_studio/ml/examples/simple_text_classifier.py
   ```
   
3. Start ML backend server
   ```bash
   label-studio-ml start my_ml_backend
   ```
   
4. Run Label Studio connecting it to the running ML backend:
    ```bash
    label-studio start text_classification_project --init --template text_sentiment --ml-backends http://localhost:9090
    ```

## Start with docker compose

Label Studio ML scripts include everything you need to create production ready ML backend server, powered by docker. It uses [uWSGI](https://uwsgi-docs.readthedocs.io/en/latest/) + [supervisord](http://supervisord.org/) stack, and handles background training jobs using [RQ](https://python-rq.org/).

After running this command:

```bash
label-studio-ml init my-ml-backend --script label_studio/ml/examples/simple_text_classifier.py
```

you'll see configs in `my-ml-backend/` directory needed to build and run docker image using docker-compose. 

Some preliminaries:

1. Ensure all requirements are specified in `my-ml-backend/requirements.txt` file, e.g. place

    ```requirements.txt
    scikit-learn
    ```
   
2. There are no services currently running on ports 9090, 6379 (otherwise change default ports in `my-ml-backend/docker-compose.yml`)

Then from `my-ml-backend/` directory run
```bash
docker-compose up
```

The server starts listening on port 9090, and you can connect it to Label Studio by specifying `--ml-backends http://localhost:9090`
 or via UI on **Model** page.
 
## Create your own ML backend

Check examples in `label_studio/ml/examples` directory.
