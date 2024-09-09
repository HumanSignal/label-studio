---
title: Integrate WatsonX with Label Studio
type: guide
tier: all
order: 15
hide_menu: true
hide_frontmatter_title: true
meta_title: Integrate WatsonX with Label Studio
categories:
    - Generative AI
    - Large Language Model
    - WatsonX
image: "/tutorials/watsonx.png"
---

# Integrate WatsonX to Label Studio

WatsonX offers a suite of machine learning tools, including access to many LLMs, prompt
refinement interfaces, and datastores via WatsonX.data. When you integrate WatsonX with Label Studio, you get 
access to these models and can automatically keep your annotated data up to date in your WatsonX.data tables. 

To run the integration, you'll need to pull this repo and host it locally or in the cloud. Then, you can link the model 
to your Label Studio project under the `models` section in the settings. To use the WatsonX.data integration, 
set up a webhook in settings under `webhooks` by using the following structure for the link: 
`<link to your hosted container>/data/upload` and set the triggers to `ANNOTATION_CREATED` and `ANNOTATION_UPDATED`. For more
on webhooks, see [our documentation](https://labelstud.io/guide/webhooks)

See the configuration notes at the bottom for details on how to set up your environment variables to get the system to work.

For a video demonstration, see [Integrating Label Studio with IBM WatsonX](https://www.youtube.com/watch?v=9iP2yO4Geqc).

## Before you begin

Before you begin, you must install the [Label Studio ML backend](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#quickstart). 

This tutorial uses the [`watsonx_llm` example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/watsonx_llm). 

## Setting up your label_config
For this project, we recommend you start with the labeling config as defined below, but you can always edit it or expand it to
meet your needs! Crucially, there must be a `<TextArea>` tag for the model to insert its response into. 

```xml
    <View>
        <Style>
            .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }
    
            .text-container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            padding: 20px;
            font-family: 'Courier New', monospace;
            line-height: 1.6;
            font-size: 16px;
            }
        </Style>
        <Header value="Context:"/>
        <View className="text-container">
            <Text name="context" value="$text"/>
        </View>
        <Header value="Prompt:"/>
        <View className="prompt">
            <TextArea name="prompt"
                      toName="context"
                      rows="4"
                      editable="true"
                      maxSubmissions="1"
                      showSubmitButton="false"
                      placeholder="Type your prompt here then Shift+Enter..."
            />
        </View>
        <Header value="Response:"/>
        <TextArea name="response"
                  toName="context"
                  rows="4"
                  editable="true"
                  maxSubmissions="1"
                  showSubmitButton="false"
                  smart="false"
                  placeholder="Generated response will appear here..."
        />
        
        <Header value="Overall response quality:"/>
        <Rating name="rating" toName="context"/>
    </View>
```

## Setting up WatsonX.Data
To use your WatsonX.data integration, follow the steps below. 
1. First, get the host and port information of the engine that you'll be using. To do this, navigate to the Infrastructure Manager 
on the left sidebar of your WatsonX.data page and select the Infrastructure Manager. Change to list view by clicking the symbol in 
the upper right hand corner. From there, click on the name of the engine you'll be using. This will bring up a pop up window, 
where you can see the host and port information under "host". The port is the part after the `:` at the end of the url. 
2. Next, make sure your catalog is set up. To create a new catalog, follow [these instructions](https://dataplatform.cloud.ibm.com/docs/content/wsj/catalog/create-catalog.html?context=wx&locale=en)
3. Once your catalog is set up, make sure that the correct schema is also set up. Navigate to your Data Manager and select `create` to create a new schema
4. With all of this information, you're ready to update the environment variables listed at the bottom of this page and get started with your WatsonX.data integration! 


## Running with Docker (recommended)

1. Start Machine Learning backend on `http://localhost:9090` with prebuilt image:

```bash
docker-compose up
```

2. Validate that backend is running

```bash
$ curl http://localhost:9090/
{"status":"UP"}
```

3. Create a project in Label Studio. Then from the **Model** page in the project settings, [connect the model](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio). The default URL is `http://localhost:9090`.


## Building from source (advanced)

To build the ML backend from source, you have to clone the repository and build the Docker image:

```bash
docker-compose build
```

## Running without Docker (advanced)

To run the ML backend without Docker, you have to clone the repository and install all dependencies using pip:

```bash
python -m venv ml-backend
source ml-backend/bin/activate
pip install -r requirements.txt
```

Then you can start the ML backend:

```bash
label-studio-ml start ./dir_with_your_model
```

## Configuration

Parameters can be set in `docker-compose.yml` before running the container.

The following common parameters are available:
- `BASIC_AUTH_USER` - Specify the basic auth user for the model server.
- `BASIC_AUTH_PASS` - Specify the basic auth password for the model server.
- `LOG_LEVEL` - Set the log level for the model server.
- `WORKERS` - Specify the number of workers for the model server.
- `THREADS` - Specify the number of threads for the model server.

The following parameters allow you to link the WatsonX models to Label Studio:

- `LABEL_STUDIO_URL` - Specify the URL of your Label Studio instance. Note that this might need to be `http://host.docker.internal:8080` if you are running Label Studio on another Docker container.
- `LABEL_STUDIO_API_KEY`- Specify the API key for authenticating your Label Studio instance. You can find this by logging into Label Studio and and [going to the **Account & Settings** page](https://labelstud.io/guide/user_account#Access-token).
- `WATSONX_API_KEY`- Specify the API key for authenticating into WatsonX. You can generate this by following the instructions at [here](https://www.ibm.com/docs/en/watsonx/watsonxdata/1.0.x?topic=started-generating-api-keys)
- `WATSONX_PROJECT_ID`- Specify the ID of your WatsonX project from which you will run the model. Must have WML capabilities. You can find this in the `General` section of your project, which is accessible by clicking on the project from the homepage of WatsonX.
- `WATSONX_MODELTYPE`- Specify the name of the WatsonX model you'd like to use. A full list can be found in [IBM's documentation](https://ibm.github.io/watsonx-ai-python-sdk/fm_model.html#TextModels:~:text=CODELLAMA_34B_INSTRUCT_HF)
- `DEFAULT_PROMPT` - If you want the model to automatically predict on new data samples, you'll need to provide a default prompt or the location to a default prompt file. 
- `USE_INTERNAL_PROMPT` - If using a default prompt, set to 0. Otherwise, set to 1.  

The following parameters allow you to use the webhook connection to transfer data from Label Studio to WatsonX.data:

- `WATSONX_ENG_USERNAME`- MUST be `ibmlhapikey` for the integration to work.

To get the host and port information below, you can follow the steps under [Pre-requisites](https://cloud.ibm.com/docs/watsonxdata?topic=watsonxdata-con-presto-serv#conn-to-prestjava).

- `WATSONX_ENG_HOST` - the host information for your WatsonX.data Engine
- `WATSONX_ENG_PORT` - the port information for your WatsonX.data Engine
- `WATSONX_CATALOG` - the name of the catalog for the table you'll insert your data into. Must be created in the WatsonX.data platform.
- `WATSONX_SCHEMA` - the name of the schema for the table you'll insert your data into. Must be created in the WatsonX.data platform.
- `WATSONX_TABLE` - the name of the table you'll insert your data into. Does not need to be already created.