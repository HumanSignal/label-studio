---
title: Integrate Machine Learning
type: guide
order: 605
---

You can easily connect your favorite machine learning framework with Label Studio by using [Heartex SDK](https://github.com/heartexlabs/pyheartex). 

That gives you the opportunities to:
- use model predictions for pre-labeling
- simultaneously update (retrain) your model while new annotations are added
- perform labeling in active learning mode
- instantly create production-ready prediction service

There is a quick example tutorial on how to do that with simple image classification:

1. Clone pyheartex, and start serving:
    ```bash
    git clone https://github.com/heartexlabs/pyheartex.git
    cd pyheartex/examples/docker
    docker-compose up -d
    ```
2. Specify running server in your label config:
    ```json
    "ml_backend": {
      "url": "http://localhost:9090",
      "model_name": "my_super_model"
    }
    ```
3. Launch Label Studio with [image classification config](examples/image_classification/config.xml):
    ```bash
    python server.py -l ../examples/image_classification/config.xml
    ```
    
Once you're satisfied with prelabeling results, you can imediately send prediction requests via REST API:
```bash
curl -X POST -H 'Content-Type: application/json' -d '{"image_url": "https://go.heartex.net/static/samples/kittens.jpg"}' http://localhost:8200/predict
```

Feel free to play around any other models & frameworks apart from image classifiers! (see instructions [here](https://github.com/heartexlabs/pyheartex#advanced-usage))


## Debugging 

When something goes wrong, for example your predictions are failing, first thing to do is to check the log

```bash
docker exec -it model_server sh -c "tail -n50 /tmp/wsgi.log"
```
