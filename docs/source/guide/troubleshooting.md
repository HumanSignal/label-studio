---
title: Troubleshooting Label Studio
short: Troubleshooting Label Studio
tier: opensource
type: guide
order: 460
order_enterprise: 0
hide_menu: true
meta_title: Troubleshooting Label Studio
meta_description: Troubleshooting issues in Label Studio Community Edition
date: 2024-09-03 09:57:28
---

!!! error Enterprise
    This page covers common user troubleshooting scenarios for Label Studio Community version. For information specific to Label Studio Enterprise, see our [support center articles](https://support.humansignal.com/hc/en-us). 


## Installation

See [Troubleshoot installation issues](install_troubleshoot).


## Projects

### Blank page when loading a project

After starting Label Studio and opening a project, you see a blank page. Several possible issues could be the cause.

If you specify a host without a protocol such as `http://` or `https://` when starting Label Studio, Label Studio can fail to locate the correct files to load the project page.

To resolve this issue, update the host specified as an environment variable or when starting Label Studio. See [Start Label Studio](start).

## Labeling

### Slowness while labeling

* If you're using the SQLite database and another user imports a large volume of data, labeling might slow down for other users on the server due to the database load. 

* If you want to upload a large volume of data (thousands of items), consider doing that at a time when people are not labeling or use a different database backend such as PostgreSQL or Redis. You can run Docker Compose from the root directory of Label Studio to use PostgreSQL: `docker-compose up -d`, or see [Sync data from cloud or database storage](storage). 

* If you are using a labeling schema that has many thousands of labels, consider using an [external taxonomy](/tags/taxonomy) instead. 

### Image/audio/resource loading error while labeling

The most common mistake while resource loading is <b>CORS</b> (Cross-Origin Resource Sharing) problem or Cross Domain. When you are trying to fetch a picture from external hosting it could be blocked by security reasons. 

Open your browser console and check errors there. Typically, this problem is solved by the external host setup.

- If you have access to the hosting server as admin then you need to allow CORS for the web server. For example, on nginx, you can try adding the following lines to `/etc/nginx/nginx.conf` under your `location` section:

{% details <b>Click for details</b> %}
 ```conf
  location <YOUR_LOCATION> {
       if ($request_method = 'OPTIONS') {
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
          #
          # Custom headers and headers various browsers *should* be OK with but aren't
          #
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
          #
          # Tell client that this pre-flight info is valid for 20 days
          #
          add_header 'Access-Control-Max-Age' 1728000;
          add_header 'Content-Type' 'text/plain; charset=utf-8';
          add_header 'Content-Length' 0;
          return 204;
       }
       if ($request_method = 'POST') {
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
          add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range';
       }
       if ($request_method = 'GET') {
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
          add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range';
       }
  }
  ```
{% enddetails %}
* For Amazon S3, see [Configuring and using cross-origin resource sharing (CORS)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html) in the Amazon S3 User Guide.
* For GCS, see [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors) in the Google Cloud Storage documentation.
* For Microsoft Azure, see [Cross-Origin Resource Sharing (CORS) support for Azure Storage](https://docs.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services) in the Microsoft Azure documentation. 
* If you serve your data from an HTTP server created like follows: `python -m http.server 8081 -d`, run the following from the command line:
```bash
npm install http-server -g
http-server -p 3000 --cors
```

Not every host supports CORS setup, but you can to try locate CORS settings in the admin area of your host configuration.      

### Audio wave doesn't match annotations

If you find that after annotating audio data, the visible audio wave doesn't match the timestamps and the sound, try converting the audio to a different format. For example, if you are annotating mp3 files, try converting them to wav files.

```bash
ffmpeg -y -i audio.mp3 -ar 8k -ac 1 audio.wav
``` 

### Predictions aren't visible to annotators  

See [Pre-annotations](#Pre-annotations) below. 

### Can't label PDF data

Label Studio does not support labeling PDF files directly. However, you can convert files to HTML using your PDF viewer or another tool and label the PDF as part of the HTML. See an example labeling configuration in the [Label Studio playground](/playground/?config=%3CView%3E%3Cbr%3E%20%20%3CHyperText%20name%3D%22pdf%22%20value%3D%22%24pdf%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Rate%20this%20article%22%2F%3E%3Cbr%3E%20%20%3CRating%20name%3D%22rating%22%20toName%3D%22pdf%22%20maxRating%3D%2210%22%20icon%3D%22star%22%20size%3D%22medium%22%20%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22choices%22%20choice%3D%22single-radio%22%20toName%3D%22pdf%22%20showInline%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Important%20article%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Yellow%20press%22%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E).

## Cloud and local storage

When working with an external Cloud Storage connection (S3, GCS, Azure), keep the following in mind:

* Label Studio doesn’t import the data stored in the bucket, but instead creates *references* to the objects. Therefore, you have full access control on the data to be synced and shown on the labeling screen.
* Sync operations with external buckets only goes one way. It either creates tasks from objects on the bucket (Source storage) or pushes annotations to the output bucket (Target storage). Changing something on the bucket side doesn’t guarantee consistency in results.
* We recommend using a separate bucket folder for each Label Studio project.

### CORS errors

If you have not set up CORS, you cannot view cloud storage data from Label Studio. You might see a link to the data rather than a preview of the data, or you might see a CORS error in your web browser console:

* For Amazon S3, see [Configuring and using cross-origin resource sharing (CORS)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html) in the Amazon S3 User Guide.
* For GCS, see [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors) in the Google Cloud Storage documentation.
* For Microsoft Azure, see [Cross-Origin Resource Sharing (CORS) support for Azure Storage](https://docs.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services) in the Microsoft Azure documentation. 

!!! note
    1. Make sure to apply the correct role and permissions for your Service Account. For example, Service Account Role "roles/iam.serviceAccountTokenCreator" to the Service Account.

    2. If the name of the Service Account `labelstudio` is using the error displayed in the DEBUG logs, then you can enable them using the `--log-level DEBUG` flag in the `label-studio start` command.

### 403 errors

If you see 403 errors in your web browser console, make sure you configured the correct credentials. 

{% details <b> Google Cloud Storage credentials</b> %}

See [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) and [IAM permissions for Cloud Storage](https://cloud.google.com/storage/docs/access-control/iam-permissions) in the Google Cloud Storage documentation. 

Your account must have the **Service Account Token Creator** role, **Storage Object Viewer** role, and **storage.buckets.get** access permission.

Also, if you're using a service account to authorize access to the Google Cloud Platform, make sure to activate it. See [gcloud auth activate-service-account](https://cloud.google.com/sdk/gcloud/reference/auth/activate-service-account) in the Google Cloud SDK: Command Line Interface documentation.

{% enddetails %}

{% details <b>Amazon S3 credentials</b> %}

For Amazon S3, see [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) in the Amazon AWS Command Line Interface User Guide. Also check that your credentials work from the [aws client](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).

 * Ensure that you specified the correct region when creating a bucket. If needed, change the region in your source or target storage settings or the `.aws/config` file, otherwise you might have problems accessing your bucket objects.
    For example, update the following: `~/.aws/config`

    ```
    [default]
    region=us-east-2  # change to the region of your bucket
    ```
- Ensure that the credentials you used to set up the source or target storage connection are still valid. If you see 403 errors in the browser console, and you set up the correct permissions for the bucket, you might need to update the Access Key ID, Secret Access Key, and Session ID. See the AWS Identity and Access Management documentation on [Requesting temporary security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html). 

{% enddetails %}

### Clicking Sync does not update my data

Sometimes the sync process doesn’t start immediately. That is because syncing process is based on internal job scheduler. If after a period of time nothing happens, follow the steps below.

First, check that you have specified the correct credentials (see the sections above).

Then go to the cloud storage settings page and click **Edit** next to the cloud connection. From here, you can check the following:

* The **File Filter Regex** is set and correct. When no filters are specified, all found items are skipped. The filter should be a valid regular expression, not a wildcard (e.g. `.*` is a valid, `*.` is not valid)
* **Treat every bucket object as a source file** should be toggled `ON` if you work with images, audio, text files or any other binary content stored in the bucket. 

    This instructs Label Studio to create URI endpoints and store this as a labeling task payload, and resolve them into presigned `https` URLs when opening the labeling screen. 

    If you store JSON tasks in the Label Studio format in your bucket - turn this toggle `OFF`. 

* Check for rq worker failures. An easy way to check rq workers is complete an export operation. 

    From the Data manager, click **Export**, and create a new snapshot and download the JSON file. If you see an Error, most likely your rq workers are having problems. Another way to check rq workers is to login as a superuser and go to the `/django-rq` page. You should see a `workers` column. If the values are `0` or the column is empty, this can indicate a failure. 

### JSON files from a cloud storage are not synced and the Data Manager is empty

1. Edit the storage settings to enable **Treat every bucket object as a source file**. If you see tasks in the Data Manager, proceed to step 2. 
2. Disable **Treat every bucket object as a source file**. 

    If you don’t see tasks in the Data Manager, your bucket doesn’t have GET permissions, only LIST permissions.  

If there is only LIST permission, Label Studio can scan the bucket for the existence of objects without actually reading them. With GET permissions, Label Studio can read the data and extract your JSON files appropriately. 


### Tasks don't load the way I expect

If the tasks sync to Label Studio but don't appear the way that you expect, maybe with URLs instead of images or with one task where you expect to see many, check the following:
- If you're placing JSON files in [cloud storage](storage.html), place 1 task in each JSON file in the storage bucket. If you want to upload a JSON file from local storage into Label Studio, you can place multiple tasks in one JSON file. 
- If you're syncing image or audio files, make sure **Treat every bucket object as a source file** is enabled. 

### Unable to access local storage when using Windows

If you are using Windows:

1. Ensure you use double backslashes (`\\`) when setting the environment variable `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT`. This is necessary because you have to escape the backslash (\).
2. Ensure you use single backslashes (`\`) when entering the **Absolute local path** when configuring local storage for a project. 
3. Do not use spaces or non-latin symbols in `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` or in the **Absolute local path**.

Example:

```bash
LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=c:\\data\\media
Absolute local path from Local Storage settings = c:\data\media\subpath
```

## Pre-annotations

Check that you are using the correct annotation units. 

{% details <b>Image annotation units</b> %}

<!-- md image_units.md -->

{% enddetails %}

### Annotators cannot see predictions

If annotators can't see predictions or if you encounter unexpected behavior after you [import pre-annotations into Label Studio](predictions), review this guidance to resolve the issues.

First, in the **Settings > Annotation** section for your project, ensure that **Use predictions to pre-label tasks** is enabled.

#### Check the configuration values of the labeling configuration and tasks

The `from_name` of the pre-annotation task JSON must match the value of `name` in the `<Labels name="label" toName="text">` portion of the labeling configuration. The `to_name` must match the `toName` value. 

For example, the following XML:
  ```xml
  ...
  <Choices name="choice" toName="image" showInLine="true">`
  ...
  <RectangleLabels name="label" toName="image">
  ...
  ```

Should correspond with the following portions of the example JSON:
```json
...
"type": "rectanglelabels",        
"from_name": "label", "to_name": "image",
...
type": "choices",
"from_name": "choice", "to_name": "image",
...
```

#### Check the labels in your configuration and your tasks
Make sure that you have a labeling configuration set up for the labeling interface, and that the labels in your JSON file exactly match the labels in your configuration. If you're using a [tool to transform your model output](https://github.com/HumanSignal/label-studio-transformers), make sure that the labels aren't altered by the tool. 

#### Check the IDs and toName values
If you're performing nested labeling, such as displaying a TextArea tag for specific Label or Choice values, the IDs for those results must match. 

For example, if you want to transcribe text alongside a named entity resolution task, you might have the following labeling configuration:
```xml
  <View>
    <Labels name="label" toName="text">
      <Label value="PER" background="red"/>
      <Label value="ORG" background="darkorange"/>
      <Label value="LOC" background="orange"/>
      <Label value="MISC" background="green"/>
    </Labels>
    <Text name="text" value="$text"/>
    <TextArea name="entity" toName="text" perRegion="true"/>
  </View>
```

If you wanted to add predicted text and suggested transcriptions for this labeling configuration, you might use the following example JSON. 

{% details <b>Click for details</b> %}
```json
{
"data":{
         "text":"The world that we live in is a broad expanse of nothingness, said the existential philosopher, before he rode away with his cat on his motorbike. "
      },
   "predictions":[
      {
            "result":[
               {
                  "value":{
                     "start":135,
                     "end":144,
                     "text":"motorbike",
                     "labels":[
                        "ORG"
                     ]
                  },
                  "id":"def",
                  "from_name":"ner",
                  "to_name":"text",
                  "type":"labels"
               },
               {
                  "value":{
                     "start":135,
                     "end":144,
                     "text":[
                        "yay"
                     ]
                  },
                  "id":"def",
                  "from_name":"entity",
                  "to_name":"text",
                  "type":"textarea"
               }
            ]
      }
   ]
}
```

{% enddetails %}

Because the TextArea tag applies to each labeled region, the IDs for the label results and the textarea results must match. 


#### Read only and hidden regions

In some situations it's very helpful to hide or to make `read-only` bounding boxes, text spans, audio segments, etc. You can put `"readonly": true` or `"hidden": true` in regions to achieve this (the dict inside of `annotations.result` list).  

## Exports

### HTML label offsets are in the wrong places

If the offsets for exported HTML labels don't match your expected output, such as with HTML named entity recognition (NER) tasks, the most common reason why is due to HTML minification. When you upload HTML files to Label Studio for labeling, the HTML is minified to remove whitespace. When you annotate those tasks, the offsets for the labels apply to the minified version of the HTML, rather than the original unmodified HTML files. 

To prevent the HTML files from being minified, you can use a different import method. See [Import HTML data](tasks.html#Import-HTML-data) for more.

If you want to correct existing annotations, you can minify your source HTML files in the same way that Label Studio does. The minification is performed with the following script:

```python
import htmlmin

with open("sample.html", "r") as f:
html_doc = f.read()

minified_html_doc = htmlmin.minify(html_doc, remove_all_empty_space=True)
```

If minification does not seem to be affecting the offset placements, complex CSS or other reasons could be the cause.

## ML backends

You can investigate most problems using the server console log. The machine learning backend runs as a separate server from Label Studio, so make sure you check the correct server console logs while troubleshooting. To see more detailed logs, start the ML backend server with the `--debug` option. 

If you're running an ML backend: 
- Production training logs are located in `my_backend/logs/rq.log`
- Production runtime logs are located in `my_backend/logs/uwsgi.log`
In development mode, training logs appear in the web browser console. 

If you're running an ML backend using Docker Compose:
- Training logs are located in `logs/rq.log`
- Main process and inference logs are located in `logs/uwsgi.log`

### Label Studio default timeout settings for ML server requests

Label studio has default timeouts for all types of requests to ML server. 

Label studio has several different requests to ML server:
1. Health - request to check ML backend health status when adding new ML backend (env variable `ML_TIMEOUT_HEALTH`)
2. Setup - request to setup ML backend, initialize ML model (env variable ML_TIMEOUT_SETUP)
3. Predict - prediction request when Label Studio gets predictions from ML backend (env variable `ML_TIMEOUT_PREDICT`)
4. Train - request to train ML backend  (env variable `ML_TIMEOUT_PREDICT`)
5. Duplicate model - duplicate model request to ML backend (env variable `ML_TIMEOUT_PREDICT`)
6. Delete - send delete request to ML backend (env variable `ML_TIMEOUT_PREDICT`)
7. Train job status - request train job status from ML backend (env variable `ML_TIMEOUT_PREDICT`)

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

You can modify them in [ml/api_connector.py](https://github.com/HumanSignal/label-studio/blob/develop/label_studio/ml/api_connector.py#L22..L31).

### I launched the ML backend, but it appears as **Disconnected** after adding it in the Label Studio UI

Your ML backend server might not have started properly. 

1. Check whether the ML backend server is running. Run the following health check:<br/> `curl -X GET http://localhost:9090/health`
2. If the health check doesn't respond, or you see errors, check the server logs.
3. If you used Docker Compose to start the ML backend, check for requirements missing from the `requirements.txt` file used to set up the environment inside Docker.


### The ML backend seems to be connected, but after I click "Start Training", I see "Error. Click here for details." message

Click the error message to review the traceback. Common errors that you might see include:
- Insufficient number of annotations completed for training to begin.
- Memory issues on the server. 
If you can't resolve the traceback issues by yourself, <a href="https://slack.labelstud.io/?source=docs-ML">contact us on Slack</a>.

### My predictions are wrong or I don't see the model prediction results on the labeling page

Your ML backend might be producing predictions in the wrong format. 

- Check to see whether the ML backend predictions format follows the same structure as [predictions in imported pre-annotations](predictions.html).
- Confirm that your project's label configuration matches the output produced by your ML backend. For example, use the `<Choices>` tag to create a class of predictions for text. See more [Label Studio tags](/tags). 

### The model backend fails to start or run properly

If you see errors about missing packages in the terminal after starting your ML backend server, or in the logs, you might need to specify additional packages in the `requirements.txt` file for your ML backend.

### ML backend is unable to access tasks

Because the ML backend and Label Studio are different services, the assets (images, audio, etc.) that you label must be hosted and be accessible with URLs by the machine learning backend, otherwise it might fail to create predictions.

### I get a validation error when adding the ML backend

If you get a validation error when adding the ML backend URL to your Label Studio project, check the following:
- Is the labeling interface set up with a valid configuration?
- Is the machine learning backend running? Run the following health check:<br/> `curl -X GET http://localhost:9090/health`
- Is your machine learning backend available from your Label Studio instance? It must be available to the instance running Label Studio.

If you're running Label Studio in Docker, you must run the machine learning backend inside the same Docker container, or otherwise make it available to the Docker container running Label Studio. You can use the `docker exec` command to run commands inside the Docker container, or use `docker exec -it <container_id> /bin/sh` to start a shell in the context of the container. See the [docker exec documentation](https://docs.docker.com/engine/reference/commandline/exec/). 


### No such file or directory error on Windows

If you encounter an error similar to the following when running `docker-compose up --build` on Windows:

```
exec /app/start.sh : No such file or directory
exited with code 1
```

This issue is likely caused by Windows' handling of line endings in text files, which can affect scripts
like `start.sh`. To resolve this issue, follow the steps below:

#### Step 1: Adjust Git Configuration

Before cloning the repository, ensure your Git is configured to not automatically convert line endings to
Windows-style (CRLF) when checking out files. This can be achieved by setting `core.autocrlf` to `false`. Open Git Bash
or your preferred terminal and execute the following command:

```
git config --global core.autocrlf false
```

#### Step 2: Clone the Repository Again

If you have already cloned the repository before adjusting your Git configuration, you'll need to clone it again to
ensure that the line endings are preserved correctly:

1. **Delete the existing local repository.** Ensure you have backed up any changes or work in progress.
2. **Clone the repository again.** Use the standard Git clone command to clone the repository to your local machine.

#### Step 3: Build and Run the Docker Containers

Navigate to the appropriate directory within your cloned repository that contains the Dockerfile
and `docker-compose.yml`. Then, proceed with the Docker commands:

1. **Build the Docker containers:** Run `docker-compose build` to build the Docker containers based on the configuration
   specified in `docker-compose.yml`.

2. **Start the Docker containers:** Once the build process is complete, start the containers using `docker-compose up`.

#### Additional Notes

- This solution specifically addresses issues encountered on Windows due to the automatic conversion of line endings. If
  you're using another operating system, this solution may not apply.
- Remember to check your project's `.gitattributes` file, if it exists, as it can also influence how Git handles line
  endings in your files.

By following these steps, you should be able to resolve issues related to Docker not recognizing the `start.sh` script
on Windows due to line ending conversions.


### Pip Cache Reset in Docker Images

Sometimes, you want to reset the pip cache to ensure that the latest versions of the dependencies are installed. 
For example, Label Studio ML Backend library is used as 
`label-studio-ml @ git+https://github.com/HumanSignal/label-studio-ml-backend.git` in requirements.txt. Let's assume that it
is updated, and you want to jump on the latest version in your docker image with the ML model. 

You can rebuild a docker image from scratch with the following command:

```bash
docker compose build --no-cache
```

### `Bad Gateway` and `Service Unavailable` errors

You might see these errors if you send multiple concurrent requests. 

Note that the provided ML backend examples are offered in development mode, and do not support production-level inference serving. 

### ML backend fails to make simple auto-annotations or unable to see predictions

You must ensure that the ML backend can access your Label Studio data. If it can't, you might encounter the following issues:

* `no such file or directory` errors in the server logs.
* You are unable to see predictions when loading tasks in Label Studio.
* Your ML backend appears to be connected properly, but cannot seem to complete any auto annotations within tasks. 

To remedy this, ensure you have set the `LABEL_STUDIO_URL` and `LABEL_STUDIO_API_KEY` environment variables. For more information, see [Allow the ML backend to access Label Studio data](ml#Allow-the-ML-backend-to-access-Label-Studio-data).