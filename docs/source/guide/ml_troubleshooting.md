---
title: Troubleshoot machine learning
short: Troubleshooting
type: guide
tier: all
order: 213
order_enterprise: 119
meta_title: Troubleshoot Machine Learning
meta_description: Troubleshoot Label Studio connections with machine learning frameworks using the Label Studio ML backend SDK.
section: "Machine learning"

---

After you [set up machine learning with Label Studio](ml.html) or [create your own machine learning backend](ml_create.html) to use with Label Studio, you can troubleshoot any issues you encounter by reviewing the possible causes on this page.


## Troubleshoot by reviewing the ML server logs

You can investigate most problems using the server console log. The machine learning backend runs as a separate server from Label Studio, so make sure you check the correct server console logs while troubleshooting. To see more detailed logs, start the ML backend server with the `--debug` option. 

If you're running an ML backend: 
- Production training logs are located in `my_backend/logs/rq.log`
- Production runtime logs are located in `my_backend/logs/uwsgi.log`
In development mode, training logs appear in the web browser console. 

If you're running an ML backend using Docker Compose:
- Training logs are located in `logs/rq.log`
- Main process and inference logs are located in `logs/uwsgi.log`

## Label Studio default timeout settings for ML server requests
Label studio has default timeouts for all types of requests to ML server.   

Label studio has several different requests to ML server:
1. Health - request to check ML backend health status when adding new ML backend (env variable ML_TIMEOUT_HEALTH)
2. Setup - request to setup ML backend, initialize ML model (env variable ML_TIMEOUT_SETUP)
3. Predict - prediction request when Label Studio gets predictions from ML backend (env variable ML_TIMEOUT_PREDICT)
4. Train - request to train ML backend  (env variable ML_TIMEOUT_PREDICT)
5. Duplicate model - duplicate model request to ML backend (env variable ML_TIMEOUT_PREDICT)
6. Delete - send delete request to ML backend (env variable ML_TIMEOUT_PREDICT)
7. Train job status - request train job status from ML backend (env variable ML_TIMEOUT_PREDICT)

You can adjust the timeout by setting an environment variables for each request or modify in Label Studio variables. These are the variables section in Label Studio (in seconds):

```python
CONNECTION_TIMEOUT = float(get_env('ML_CONNECTION_TIMEOUT', 1))  
TIMEOUT_DEFAULT = float(get_env('ML_TIMEOUT_DEFAULT', 100))  
TIMEOUT_TRAIN = float(get_env('ML_TIMEOUT_TRAIN', 30))
TIMEOUT_PREDICT = float(get_env('ML_TIMEOUT_PREDICT', 100))
TIMEOUT_HEALTH = float(get_env('ML_TIMEOUT_HEALTH', 1))
TIMEOUT_SETUP = float(get_env('ML_TIMEOUT_SETUP', 3))
TIMEOUT_DUPLICATE_MODEL = float(get_env('ML_TIMEOUT_DUPLICATE_MODEL', 1))
TIMEOUT_DELETE = float(get_env('ML_TIMEOUT_DELETE', 1))
TIMEOUT_TRAIN_JOB_STATUS = float(get_env('ML_TIMEOUT_TRAIN_JOB_STATUS', 1))
```

You can modify them in [ml/api_connector.py](https://github.com/heartexlabs/label-studio/blob/develop/label_studio/ml/api_connector.py#L22..L31).


## I launched the ML backend, but it appears as **Disconnected** after adding it in the Label Studio UI

Your ML backend server might not have started properly. 

1. Check whether the ML backend server is running. Run the following health check:<br/> `curl -X GET http://localhost:9090/health`
2. If the health check doesn't respond, or you see errors, check the server logs.
3. If you used Docker Compose to start the ML backend, check for requirements missing from the `requirements.txt` file used to set up the environment inside Docker.

## The ML backend seems to be connected, but after I click "Start Training", I see "Error. Click here for details." message

Click the error message to review the traceback. Common errors that you might see include:
- Insufficient number of annotations completed for training to begin.
- Memory issues on the server. 
If you can't resolve the traceback issues by yourself, <a href="https://slack.labelstudio.heartex.com/?source=docs-ML">contact us on Slack</a>.


## My predictions are wrong or I don't see the model prediction results on the labeling page

Your ML backend might be producing predictions in the wrong format. 

- Check to see whether the ML backend predictions format follows the same structure as [predictions in imported pre-annotations](predictions.html).
- Confirm that your project's label configuration matches the output produced by your ML backend. For example, use the Choices tag to create a class of predictions for text. See more [Label Studio tags](/tags). 


## The model backend fails to start or run properly

If you see errors about missing packages in the terminal after starting your ML backend server, or in the logs, you might need to specify additional packages in the `requirements.txt` file for your ML backend.

## ML backend is unable to access tasks

Because the ML backend and Label Studio are different services, the assets (images, audio, etc.) that you label must be hosted and be accessible with URLs by the machine learning backend, otherwise it might fail to create predictions.

## I get a validation error when adding the ML backend

If you get a validation error when adding the ML backend URL to your Label Studio project, check the following:
- Is the labeling interface set up with a valid configuration?
- Is the machine learning backend running? Run the following health check:<br/> `curl -X GET http://localhost:9090/health`
- Is your machine learning backend available from your Label Studio instance? It must be available to the instance running Label Studio.
  
If you're running Label Studio in Docker, you must run the machine learning backend inside the same Docker container, or otherwise make it available to the Docker container running Label Studio. You can use the `docker exec` command to run commands inside the Docker container, or use `docker exec -it <container_id> /bin/sh` to start a shell in the context of the container. See the [docker exec documentation](https://docs.docker.com/engine/reference/commandline/exec/). 

<div class="enterprise-only">
## Timeouts in SaaS Cloud

Default timeouts for all types of requests to ML server in SaaS Cload (in seconds):
  
```bash
TIMEOUT_DEFAULT = 100
TIMEOUT_TRAIN = 30
TIMEOUT_PREDICT = 100
TIMEOUT_HEALTH = 1
TIMEOUT_SETUP = 3
TIMEOUT_DUPLICATE_MODEL = 1
TIMEOUT_DELETE = 1
TIMEOUT_TRAIN_JOB_STATUS = 1
```
  
</div>
