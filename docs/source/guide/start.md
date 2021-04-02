---
title: Start Label Studio
type: guide
order: 202
meta_title: Start Commands
meta_description: Label Studio Documentation for starting Label Studio and configuring the environment to use Label Studio with your machine learning or data science project. 
---

After you install Label Studio, start the server to start using it. 

```bash
label-studio start
```

By default, Label Studio starts with a SQLite database to store labeling tasks and annotations. You can specify different source and target storage for labeling tasks and annotations using Label Studio UI or the API. See [Database storage](storedata.html) for more.

## Command line arguments for starting Label Studio
You can specify a machine learning backend and other options using the command line interface. Run `label-studio --help` to see all available options, or refer to the following tables.

Some available commands for Label Studio provide information or start the Label Studio server:

| Command |  Description |
| --- | ---- |
| `label-studio` | Start the Label Studio server. |
| `label-studio -h` `label-studio --help` | Display available command line arguments. |
| `label-studio init <project_name> <optional_arguments>` | Initialize a specific project in Label Studio. |
| `label-studio start <project_name> --init <optional_arguments>` | Start the Label Studio server and initiliaze a specific project. |
| `label-studio reset_password` | Reset the password for a specific Label Studio username. See [Create user accounts for Label Studio](signup.html). |
| `label-studio shell` | Get access to a shell for Label Studio to manipulate data directly. See documentation for the Django [shell-plus command](https://django-extensions.readthedocs.io/en/latest/shell_plus.html). |
| `label-studio version` | Show the version of Label Studio and then terminates.

The following command line arguments are optional and must be specified with `label-studio start <argument> <value>` or as an environment variable when you set up the environment to host Label Studio:

| Command line argument | Environment variable | Description |
| --- | ---- | ---- |
| `-b`, `--no-browser` | N/A | Do not automatically open a web browser when starting Label Studio. |
| `-db` `--database` | `LABEL_STUDIO_DATABASE` | Specify the database file path for storing labeling tasks and annotations. See [Database storage](install.html#Database_storage). |
| `--data-dir` | `LABEL_STUDIO_DATA_DIR` | Directory to use to store all application-related data. |
| `-d` `--debug` | N/A | Enable debug mode for troubleshooting Label Studio. |
| `-c` `--config` | `CONFIG_PATH` | Deprecated, do not use. Specify the path to the server configuration for Label Studio. |
| `-l` `--label-config` | `LABEL_STUDIO_LABEL_CONFIG` | Path to the label configuration file for a specific Label Studio project. See [Set up your labeling project](setup.html). |
| `--ml-backends` | `LABEL_STUDIO_ML_BACKENDS` | Specify the URLs for one or more machine learning backends. See [Set up machine learning with your labeling process](ml.html). |
| `--sampling` | N/A | Specify one of sequential or uniform to define the order for labeling tasks. See [Set up task sampling for your project](start.html#Set_up_task_sampling_for_your_project) on this page. |
| `--log-level` | N/A | One of DEBUG, INFO, WARNING, or ERROR. Use to specify the logging level for the Label Studio server. |
| `-p` `--port` | `LABEL_STUDIO_PORT` | Specify the web server port for Label Studio. Defaults to 8080. See [Run Label Studio on localhost with a different port](start.html#Run-Label-Studio-on-localhost-with-a-different-port) on this page. |
| `--host` | `LABEL_STUDIO_HOST` | Specify the hostname to use to generate links for imported labeling tasks or static loading requirements. Leave empty to make all paths relative to the root domain. For example, specify `"https://77.42.77.42:1234"` or `"http://ls.example.com/subdomain/"`. See [Run Label Studio with an external domain name](start.html#Run-Label-Studio-with-an-external-domain-name) on this page. |
| `--cert` | `LABEL_STUDIO_CERT_FILE` | Certificate file to use to access Label Studio over HTTPS. Must be in PEM format. See [Run Label Studio with HTTPS](start.html#Run-Label-Studio-with-HTTPS) on this page. | 
| `--key` | `LABEL_STUDIO_KEY_FILE` | Private key file for HTTPS connection. Must be in PEM format. See [Run Label Studio with HTTPS](start.html#Run-Label-Studio-with-HTTPS) on this page. |
| `--initial-project-description` | `LABEL_STUDIO_PROJECT_DESC` | Specify a project description for a Label Studio project. See [Set up your labeling project](setup.html). |
| `--password` | `LABEL_STUDIO_PASSWORD` | Password to use for the default user. |
| `--username` | `LABEL_STUDIO_USERNAME` | Username to use for the default user. |
| `--agree-fix-sqlite` | N/A | Automatically agree to let Label Studio fix SQLite issues when using Python 3.6–3.8 on Windows operating systems. | 


## Run Label Studio on localhost with a different port
By default, Label Studio runs on port 8080. If that port is already in use or if you want to specify a different port, start Label Studio with the following command:
```bash
label-studio start --port <port>
```

For example, start Label Studio on port 9001:
```bash
label-studio start --port 9001
```

Or, set the following environment variable:
```
LABEL_STUDIO_PORT = 9001
```

## Run Label Studio on Docker with a different port

To run Label Studio on Docker with a port other than the default of 8080, use the port argument when starting Label Studio on Docker. For example, to start Label Studio in a Docker container accessible with port 9001, run the following: 
```bash
docker run -it -p 9001:8080 -v `pwd`/mydata:/label-studio/data heartexlabs/label-studio:latest label-studio
```

Or, if you're using Docker Compose, update the `docker-compose.yml` file that you're using to expose a different port for the NGINX server used to proxy the connection to Label Studio. For example, this portion of the [`docker-compose.yml`](https://github.com/heartexlabs/label-studio/blob/master/docker-compose.yml) file exposes port 9001 instead of port 80 for proxying Label Studio:
```
...
nginx:
    image: nginx:latest
    ports:
      - 9001:80
    depends_on:
      - app
...
```

## Run Label Studio with HTTPS
To run Label Studio with HTTPS and access the web server using HTTPS in the browser, specify a certificate and private key when starting Label Studio. 

You can start Label Studio with the following command:
```bash
label-studio start --cert <certificate.pem> --key <keyfile.pem>
```

Or, set the following environment variables:
```
LABEL_STUDIO_CERT_FILE = <certificate.pem>
LABEL_STUDIO_KEY_FILE =  <keyfile.pem>
```

The certificate and private key files must both be provided as PEM files. 

## Run Label Studio on the cloud using Heroku
To run Label Studio on the cloud using Heroku, specify an environment variable so that Label Studio loads. 

```
LABEL_STUDIO_HOST
```

If you want, you can specify a different hostname for Label Studio, but you don't need to.

To run Label Studio with Heroku and use PostgreSQL as the [database storage](storedata.html), specify the PostgreSQL environment variables required as part of the Heroku environment variable `DATABASE_URL`. For example, to specify a PostgreSQL database hosted on Amazon:
```
DATABASE_URL = postgres://username:password@hostname.compute.amazonaws.com:5432/dbname
```
Then you can specify the required environment variables for a PostgreSQL connection as config variables. See [Database storage](storedata.html).

<!--
## Run Label Studio on the cloud using a different cloud provider
To run Label Studio on the cloud using a cloud provider such as Google Cloud Services (GCS), Amazon Web Services (AWS), or Microsoft Azure, 
-->
## Run Label Studio with an external domain name

If you want multiple people to collaborate on a project, you might want to run Label Studio with an external domain name. 

To do that, use the `host` parameter when you start Label Studio. These parameters ensure that the correct URLs are created when importing resource files (images, audio, etc) and generating labeling tasks.   

There are several possible ways to run Label Studio with an external domain name.
 
- Replace the `host` parameter in the file which you specified with `--config` option. If you don't use `--config` then edit `label_studio/utils/schema/default_config.json` in the Label Studio package directory.
- Specify the parameters when you start Label Studio: `label-studio start --host http://your.domain.com/ls-root`.
- Specify the parameters as environment variables `HOST` especially when setting up Docker: `HOST=https://your.domain.com:7777`. 

Or, you can use environment variables:
```
LABEL_STUDIO_HOST = https://subdomain.example.com:7777
```

You must specify the protocol for the domain name: `http://` or `https://`

If your external host has a port, specify the port as part of the host name. 

## Set up task sampling for your project 

When you start Label Studio, you can control the order in which tasks are exposed to annotators for a specific project.  

For example, to create a project with sequential task ordering for annotators:
```bash
label-studio start <project_name> --sampling sequential
```

The following table lists the available sampling options: 

| Option | Description |
| --- | --- | 
| sequential | Default. Tasks are shown to annotators in ascending order by the `id` field. |
| uniform | Tasks are sampled with equal probabilities. |
| prediction-score-min | Tasks with the minimum average prediction score are shown to annotators. To use this option, you must also include predictions data in the task data that you import into Label Studio. |

You can also use the API to set up sampling for a specific project. Send a PATCH request to the `/api/projects/<project_id>` endpoint to set sampling for the specified project. See the [API reference for projects](/api#operation/projects_partial_update). 

Individual annotators can also control the order in which they label tasks by adjusting the filtering and ordering of labeling tasks in the Label Studio UI. See [Set up your labeling project](setup.html).
