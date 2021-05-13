---
title: Troubleshoot machine learning
type: guide
order: 609
meta_title: Troubleshoot Machine Learning
meta_description: Label Studio Documentation for troubleshooting Label Studio connections with machine learning frameworks using the Label Studio machine learning SDK for machine learning and data science projects.
---

After you [set up machine learning with Label Studio] or [create your own machine learning backend] to use with Label Studio, you can troubleshoot any issues you encounter by reviewing the possible causes on this page.

## Troubleshoot by reviewing the ML server logs
You can investigate most problems using the server console log. The machine learning backend runs as a separate server from Label Studio, so make sure you check the correct server console logs while troubleshooting. To see more detailed logs, start the ML backend server with the `--debug` option. 

If you're running an ML backend: 
- Production training logs are located in `my_backend/logs/rq.log`
- Production runtime logs are located in `my_backend/logs/uwsgi.log`
In development mode, training logs appear in the web browser console. 

If you're running an ML backend using Docker Compose:
- Training logs are located in `logs/rq.log`
- Main process and inference logs are located in `logs/uwsgi.log`

## I launched the ML backend, but it appears as **Disconnected** after adding it in the Label Studio UI

Your ML backend server might not have started properly. 

1. Check whether the ML backend server is running. Run the following health check:<br/> `curl -X GET http://localhost:9090/health`
2. If the health check doesn't respond, or you see errors, check the server logs.
3. If you used Docker Compose to start the ML backend, check for requirements missing from the `requirements.txt` file used to set up the environment inside Docker.

## The ML backend seems to be connected, but after I click "Start Training", I see "Error. Click here for details." message

Click the error message to review the traceback. Common errors that you might see include:
- Insufficient number of annotations completed for training to begin.
- Memory issues on the server. 
If you can't resolve the traceback issues by yourself, <a href="https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw">contact us on Slack</a>.

## My predictions are wrong or I don't see the model prediction results on the labeling page

Your ML backend might be producing predictions in the wrong format. 

- Check to see whether the ML backend predictions format follows the same structure as [predictions in imported pre-annotations](predictions.html).
- Confirm that your project's label configuration matches the output produced by your ML backend. For example, use the Choices tag to create a class of predictions for text. See more [Label Studio tags](/tags.html). 

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