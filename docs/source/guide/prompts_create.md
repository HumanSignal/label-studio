---
title: Create a Prompt
short: Create a Prompt
tier: enterprise
type: guide
order: 0
order_enterprise: 228
meta_title: Create a Prompt
meta_description: How to create a Prompt
section: Prompts
date: 2024-06-11 16:53:16
---


## Prerequisites

* An OpenAI API key or an Azure OpenAI key. 
* A project that meets the following criteria:
  * Text-based data set (meaning you are annotating text and not image or video files). 
  * The labeling configuration for the project must be set up to use single-class classification (`choice="single"`). 
  * (Optional, depending on your [use case](prompts_overview#Use-cases) and if you want to evaluate the accuracy of your prompt): At least one task with a [ground truth annotation](quality#Define-ground-truth-annotations-for-a-project). 

## Model provider API keys

You can specify one OpenAI API key and/or multiple Azure OpenAI keys per organization. Keys only need to be added once. 

Click **API Keys** in the top right of the Prompts page to open the **Model Provider API Keys** window:

![Screenshot of the API keys modal](/images/prompts/model_keys.png)

Once added, you will have the option to select from the base models associated with each API key as you configure your prompts:

![Screenshot of the Base Models drop-down](/images/prompts/base_models.png)

To remove the key, click **API Keys** in the upper right of the Prompts page. You'll have the option to remove the key and add a new one. 

{% details <b>Use an OpenAI key</b> %}

You can only have one OpenAI key per organization. For a list of the OpenAI models we support, see [Features, requirements, and constraints](prompts_overview#Features-requirements-and-constraints). 

You can find your OpenAI API key on the [API key page](https://platform.openai.com/api-keys). 

Once added, all supported OpenAI models will appear in the base model options when you configure your prompt.

{% enddetails %}

{% details <b>Use an Azure OpenAI key</b> %}

Each Azure OpenAI key is tied to a specific deployment, and each deployment comprises a single OpenAI model. So if you want to use multiple models through Azure, you will need to create a deployment for each model and then add each key to Label Studio. 

For a list of the Azure OpenAI models we support, see [Features, requirements, and constraints](prompts_overview#Features-requirements-and-constraints). 

To use Azure OpenAI, you must first create the Azure OpenAI resource and then a model deployment:

1. From the Azure portal, [create an Azure OpenAI resource](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource?pivots=web-portal#create-a-resource). 

!!! note
    If you are restricting network access to your resource, you will need to add the following IP addresses when configuring network security:
    
    * 3.219.3.197
    * 34.237.73.3
    * 44.216.17.242


2. From Azure OpenAI Studio, [create a deployment](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource?pivots=web-portal#deploy-a-model). This is a base model endpoint. 

When adding the key to Label Studio, you are asked for the following information:

| Field | Description|
| --- | --- |
| **Deployment** | The is the name of the deployment. By default, this is the same as the model name, but you can customize it when you create the deployment. If they are different, you must use the deployment name and not the underlying model name. |
| **Endpoint** | This is the target URI provided by Azure.  |
| **API key** | This is the key provided by Azure. |

You can find all this information in the **Details** section of the deployment in Azure OpenAI Studio. 

![Screenshot of the Azure deployment details](/images/prompts/azure_deployment.png)

{% enddetails %}


## Create a Prompt

From the Prompts page, click **Create Prompt** in the upper right and then complete the following fields:

<div class="noheader rowheader">

| | |
| --- | --- |
| Name | Enter a name for the Prompt. |
| Description | Enter a description for the Prompt.  |
| Type | Select the Prompt model type. At this time, we only support [text classification](#Text-classification). |
| Target Project| Select the project you want to use. If you don't have any eligible projects, you will see an error message. <br><br>See the note below.  |
| Classes | This list is automatically generated from the labeling configuration of the target project. |

</div>

!!! note Eligible projects
    Target projects must meet the following criteria:
    * The labeling configuration for the project must use single class classification (e.g. `choice="single"`). 
    * The project must include text data (e.g. it cannot only include unsupported data types such as image, audio, video).
    * You must have access to the project. If you are in the Manager role, you need to be added to the project to have access. 

![Screenshot of the create model page](/images/prompts/model_create.png)

## Types

### Text classification 

At present, Prompts only supports single-label text classification tasks.  

Text classification is the process of assigning predefined categories or labels to segments of text based on their content. This involves analyzing the text and determining which category or label best describes its subject, sentiment, or purpose. The goal is to organize and categorize textual data in a way that makes it easier to analyze, search, and utilize. 

Text classification labeling tasks are fundamental in many applications, enabling efficient data organization, improving searchability, and providing valuable insights through data analysis. Some examples include:

* **Spam Detection**: Classifying emails as "spam" or "ham" (not spam). 
* **Sentiment Analysis**: Categorizing user reviews as "positive," "negative," or "neutral."
* **Topic Categorization**: Assigning articles to categories like "politics," "sports," "technology," etc.
* **Support Ticket Classification**: Labeling customer support tickets based on the issue type, such as "billing," "technical support," or "account management."
* **Content Moderation**: Identifying and labeling inappropriate content on social media platforms, such as "offensive language," "hate speech," or "harassment."

