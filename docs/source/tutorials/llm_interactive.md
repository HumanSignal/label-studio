---
title: Interactive LLM labeling with GPT
type: guide
tier: all
order: 5
hide_menu: true
hide_frontmatter_title: true
meta_title: Interactive LLM labeling with OpenAI, Azure, or Ollama
meta_description: Label Studio tutorial for interactive LLM labeling with OpenAI, Azure, or Ollama
categories:
    - Generative AI
    - Large Language Model
    - OpenAI
    - Azure
    - Ollama
    - ChatGPT
image: "/tutorials/llm-interactive.png"
---

# Interactive LLM labeling

This example server connects Label Studio to [OpenAI](https://platform.openai.com/), [Ollama](https://ollama.com/),
or [Azure](https://azure.microsoft.com/en-us/products/ai-services/openai-service) API to interact with GPT chat models (
gpt-3.5-turbo, gpt-4, etc.).

The interactive flow allows you to perform the following scenarios:

* Autolabel data given an LLM prompt (e.g. "Classify this text as sarcastic or not")
* Collect pairs of user prompts and response inputs to fine tune your own LLM.
* Automate data collection and summarization over image documents.
* Create a RLHF (Reinforcement Learning from Human Feedback) loop to improve the LLM's performance.
* Evaluate the LLM's performance.

Check the [Generative AI templates](https://labelstud.io/templates/gallery_generative_ai) section for more examples.

## Before you begin

Before you begin, you must install the [Label Studio ML backend](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#quickstart). 

This tutorial uses the [`llm_interactive` example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/llm_interactive). 

## Quickstart

1. Build and start the Machine Learning backend on `http://localhost:9090` <br /><br />
```bash
docker-compose up
```

2. Check if it works: <br /><br />
 ```bash
$ curl http://localhost:9090/health
{"status":"UP"}
```

3. Open a Label Studio project and go to **Settings > Model**. [Connect the model](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio), specifying `http://localhost:9090` as the URL. 
   
   Ensure the **Interactive preannotations** toggle is enabled and click **Validate and Save**.
4. The project config should be compatible with the ML backend. This ML backend can support various input data formats
   like plain text, hypertext, images, and structured dialogs. To ensure the project config is compatible, follow these
   rules:

   - The project should contain at least one `<TextArea>` tag to be used as a prompt input. To specify which `<TextArea>` tag  to use, set the `PROMPT_PREFIX` environment variable.   
   For example, if your labeling config includes `<TextArea name="prompt" ...>`, then you would specify `PROMPT_PREFIX=prompt`.
   - The project should contain at least one input data tag from the following list of supported tags: `<Text>`, `<Image>`, `<HyperText>`, `<Paragraphs>`.
   - If you want to capture the generated LLM response as a label, your labeling config should contain a `<Choices>` tag.  
   For example, `<Choices name="choices" ...>`.
   - If you want to set the default prompt to be shown before the user input, you can set the `DEFAULT_PROMPT` environment variable. For example, `DEFAULT_PROMPT="Classify this text as sarcastic or not. Text: {text}, Labels: {labels}"` or `DEFAULT_PROMPT=/path/to/prompt.txt`. 
  
    Note that the default prompt isn't supported with `USE_INTERNAL_PROMPT_TEMPLATE=1` mode, so you will need to set `USE_INTERNAL_PROMPT_TEMPLATE=0` to use default prompt. You can use the fields from `task['data']` in the prompt template, as well as special `{labels}` field to show the list of available labels.

5. Open a task and ensure the **Auto-Annotation** toggle is enabled (it is located at the bottom of the labeling interface).
6. Enter a prompt in the prompt input field and press `Shift+Enter`. The LLM response will be generated and displayed in
   the response field.
7. If you want to apply LLM auto-annotation to multiple tasks at once, go to the [Data Manager](https://labelstud.io/guide/manage_data), select a group of tasks and then select **Actions > Retrieve Predictions** (or **Batch Predictions** in Label Studio Enterprise).

## Configuration examples

### Prompt engineering and model response evaluation

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
    <Header value="Evaluate model response using one or more metrics:"/>
    <Taxonomy name="evals" toName="context" leafsOnly="true" showFullPath="true" pathSeparator=": ">
        <Choice value="Relevance">
            <Choice value="Relevant"/>
            <Choice value="Irrelevant"/>
        </Choice>
        <Choice value="Correctness">
            <Choice value="Correct"/>
            <Choice value="Incorrect"/>
            <Choice value="Contains hallucinations"/>
        </Choice>
        <Choice value="Bias">
            <Choice value="Gender" hint="Discrimination based on a person's gender."/>
            <Choice value="Political"
                    hint="A preference for or prejudice against a particular political party, ideology, or set of beliefs."/>
            <Choice value="Racial/Ethnic"
                    hint="Prejudice or discrimination based on a person's race, ethnicity, or national origin."/>
            <Choice value="Geographical"
                    hint=" Prejudices or preferential treatment based on where a person lives or comes from."/>
        </Choice>
        <Choice value="Toxicity">
            <Choice value="Personal Attacks"
                    hint="Insults or hostile comments aimed at degrading the individual rather than addressing their ideas."/>
            <Choice value="Mockery" hint="Sarcasm or ridicule used to belittle someone."/>
            <Choice value="Hate"
                    hint="Expressions of intense dislike or disgust, often targeting someone's identity or beliefs."/>
            <Choice value="Dismissive Statements"
                    hint="Comments that invalidate the person's viewpoint or shut down discussion without engaging constructively."/>
            <Choice value="Threats or Intimidation"
                    hint="Statements intending to frighten, control, or harm someone, either physically or emotionally."/>
            <Choice value="Profanity"
                    hint="Use of strong or offensive language that may be considered disrespectful or vulgar."/>
            <Choice value="Sexual Harassment" hint="Unwelcome or inappropriate sexual remarks or physical advances."/>
        </Choice>
    </Taxonomy>
    <Header value="Overall response quality:"/>
    <Rating name="rating" toName="context"/>
</View>
```

### Automatic text classification

```xml

<View>
    <Style>
        .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }
    </Style>
    <!-- Input data -->
    <Text name="text" value="$text"/>
    <!-- Prompt input -->
    <TextArea name="prompt" toName="text" editable="true" rows="2" maxSubmissions="1" showSubmitButton="false"/>
    <!-- LLM response output -->
    <TextArea name="response" toName="text" smart="false" editable="true"/>
    <View style="box-shadow: 2px 2px 5px #999;
               padding: 20px; margin-top: 2em;
               border-radius: 5px;">
        <Choices name="sentiment" toName="text"
                 choice="multiple" showInLine="true">
            <Choice value="Sarcastic"/>
            <Choice value="Not Sarcastic"/>
        </Choices>
    </View>
</View>
```

**Example data input:**

```json
{
  "text": "I love it when my computer crashes"
}
```

### Collecting data for LLM supervised fine-tuning

Representing ChatGPT-style interface with [`<Paragraphs>`](https://labelstud.io/tags/paragraphs) tag:

```xml

<View>
    <Style>
        .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }
    </Style>
    <Paragraphs name="chat" value="$dialogue" layout="dialogue" textKey="content" nameKey="role"/>
    <Header value="User prompt:"/>
    <View className="prompt">
        <TextArea name="prompt" toName="chat" rows="4" editable="true" maxSubmissions="1" showSubmitButton="false"/>
    </View>
    <Header value="Bot answer:"/>
    <TextArea name="response" toName="chat" rows="4" editable="true" smart="false" maxSubmissions="1" showSubmitButton="false"/>

</View>
```

**Example data input:**

```json
{
  "dialogue": [
    {
      "role": "user",
      "content": "What is the capital of France?"
    },
    {
      "role": "assistant",
      "content": "The capital of France is Paris."
    },
    {
      "role": "user",
      "content": "Tell me a joke."
    }
  ]
}
```

### Automating data collection and summarization over image documents

```xml

<View>
    <Style>
        .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }

        .container {
        display: flex;
        justify-content: space-between; /* Align children with space in between */
        align-items: flex-start; /* Align children at the start of the cross axis */
        }

        .image {
        /* Adjust these values according to the size of your image */
        width: 600px; /* Example width for the image */
        height: auto; /* Maintain aspect ratio */
        /* Removed position: sticky, float: right, and margin-right */
        }

        .blocks {
        width: calc(100% - 220px); /* Adjust the calculation to account for the image width and some margin */
        height: 600px; /* Set the height for the scrolling area */
        overflow-y: scroll; /* Allow vertical scrolling */
        }

        .block {
        background-color: #f0f0f0; /* Sample background color for each block */
        padding: 20px; /* Spacing inside each block */
        margin-bottom: 10px; /* Spacing between blocks */
        }


    </Style>
    <View className="container">
        <View className="blocks">

            <View className="block">
                <Header value="Prompt:"/>
                <View className="prompt">
                    <TextArea name="prompt" toName="image"
                              showSubmitButton="false"
                              editable="true"
                              rows="3"
                              required="true"/>
                </View>
                <Header value="Classification:"/>

                <Choices name="category" toName="image" smart="false" layout="select">
                    <Choice value="Groceries"/>
                    <Choice value="Dining/Restaurants"/>
                    <Choice value="Clothing/Apparel"/>
                    <Choice value="Electronics"/>
                    <Choice value="Home Improvement"/>
                    <Choice value="Health/Pharmacy"/>
                    <Choice value="Gasoline/Fuel"/>
                    <Choice value="Transportation/Travel"/>
                    <Choice value="Entertainment/Leisure"/>
                    <Choice value="Utilities/Bills"/>
                    <Choice value="Insurance"/>
                    <Choice value="Gifts/Donations"/>
                    <Choice value="Personal Care"/>
                    <Choice value="Education/Books"/>
                    <Choice value="Professional Services"/>
                    <Choice value="Membership/Subscriptions"/>
                    <Choice value="Taxes"/>
                    <Choice value="Vehicle Maintenance/Repairs"/>
                    <Choice value="Pet Care"/>
                    <Choice value="Home Furnishings/Decor"/>
                    <Choice value="Other"/>
                </Choices>
            </View>
            <View className="block">
                <Header value="Summary:"/>
                <TextArea name="summarization-response" toName="image"
                          showSubmitButton="false"
                          maxSubmissions="0"
                          editable="true"
                          smart="false"
                          rows="3"
                />
            </View>
        </View>
        <View className="image">
            <Image name="image" value="$image"/>
        </View>
    </View>
</View>
```

**Example data input:**

```json
{
  "image": "https://sandbox2-test-bucket.s3.amazonaws.com/receipts/113494_page1.png"
}
```

## Parameters

When deploying the server, you can specify the following parameters as environment variables:

- `DEFAULT_PROMPT`: Define a default prompt to be shown before the user input. For example, `DEFAULT_PROMPT="Classify this text as sarcastic or not. Text: {text}, Labels: {labels}"` or `DEFAULT_PROMPT=/path/to/prompt.txt`. 

    Note that `USE_INTERNAL_PROMPT_TEMPLATE` should be set to `0` if you are setting a default prompt.

- `PROMPT_PREFIX` (default: `prompt`): An identifier for the prompt input field. For example, if you set
  `PROMPT_PREFIX` to `my-prompt`, the following input field will be used for the
  prompt: `<TextArea name="my-prompt" ...>`.

- `USE_INTERNAL_PROMPT_TEMPLATE` (default: `1`). If set to `1`, the server will use the internal prompt template. If set
  to
  `0`, the server will use the prompt template provided in the input prompt.

- `PROMPT_TEMPLATE` (default: `"Source Text: {text}\n\nTask Directive: {prompt}"`): The prompt template to use:

  - If `USE_INTERNAL_PROMPT_TEMPLATE` is set to `1`, the server will use
  the default internal prompt template. 
  
  - If `USE_INTERNAL_PROMPT_TEMPLATE` is set to `0`, the server will use the prompt template provided
  in the input prompt (i.e. the user input from `<TextArea name="my-prompt" ...>`). 
  
  In the later case, the user has to provide the placeholders that match input task fields. For example, if the user wants to use the `input_text` and `instruction` field from the input task `{"input_text": "user text", "instruction": "user instruction"}`, the user has to provide the prompt template like this: `"Source Text: {input_text}, Custom instruction : {instruction}"`.

- `OPENAI_MODEL` (default: `gpt-3.5-turbo`) : The OpenAI model to use. 

- `OPENAI_PROVIDER` (available options: `openai`, `azure`, `ollama`, default - `openai`) : The OpenAI provider to use.

- `TEMPERATURE` (default: `0.7`): The temperature to use for the model.

- `NUM_RESPONSES` (default: `1`): The number of responses to generate in `<TextArea>` output fields. Useful if you want
  to generate multiple responses and let the user rank the best one.

- `OPENAI_API_KEY`: The OpenAI or Azure API key to use. Must be set before deploying the server.

### Azure Configuration

If you are using Azure as your OpenAI provider (`OPENAI_PROVIDER=azure`), you need to specify the following environment
variables:

- `AZURE_RESOURCE_ENDPOINT`: This is the endpoint for your Azure resource. It should be set to the appropriate value
  based on your Azure setup.

- `AZURE_DEPLOYMENT_NAME`: This is the name of your Azure deployment. It should match the name you've given to your
  deployment in Azure.

- `AZURE_API_VERSION`: This is the version of the Azure API you are using. The default value is `2023-05-15`.

### Ollama Configuration

If you are using Ollama as your LLM provider (`OPENAI_PROVIDER=ollama`), you need to specify the following environment variables: 

- `OPENAI_MODEL` : The Ollama model to use, for example `llama3`. 

- `OLLAMA_ENDPOINT`: This is the endpoint for your Ollama endpoint. It should be set to the appropriate value based on your setup. If you are running it locally, then it can typically be reached on `http://host.docker.internal:11434/v1/`