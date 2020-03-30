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

Here is a quick example tutorial on how to do that with simple image classification:
   
1. Clone [pyheartex](https://github.com/heartexlabs/pyheartex), and start serving example image classifier ML backend at `http://localhost:9090`
    ```bash
    git clone https://github.com/heartexlabs/pyheartex.git
    cd pyheartex/examples/docker
    docker-compose up -d
    ```
   
2. Run Label Studio project specifying ML backend URLs:

    ```bash
    label-studio start imgcls --init --template image_classification \
    --ml-backend-url http://localhost:9090 --ml-backend-name my_model
    ```
    
Once you're satisfied with pre-labeling results, you can immediately send prediction requests via REST API:
```bash
curl -X POST -H 'Content-Type: application/json' -d '{"image_url": "https://go.heartex.net/static/samples/sample.jpg"}' http://localhost:8080/predict
```

> Note: There is a limitation of using ML backend with locally hosted files, i.e. you can't train your models on tasks with URLs like `{"url": "http://localhost:8080/static/image.png"}`. URLs should be accessible from the outside.

Feel free to play around with any other models & frameworks apart from image classifiers! [See instructions](https://github.com/heartexlabs/pyheartex#advanced-usage) on how to connect existing models.

When something goes wrong, for example your predictions are failing, the first thing to do is to check the _runtime logs_

```bash
docker exec -it model_server sh -c "tail -n50 /tmp/wsgi.log"
```

To see what happens during model training, check _training logs_:

```bash
docker exec -it model_server sh -c "tail -n50 /tmp/rq.log"
```
