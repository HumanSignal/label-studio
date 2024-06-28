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

* An OpenAI API key. 
* A project that meets the following criteria:
  * Text-based data set (meaning you are annotating text and not image or video files). 
  * The labeling configuration for the project must be set up to use single-class classification (`choice="single"`). 
  * (Optional, depending on your [use case](prompts_overview#Use-cases) and if you want to evaluate the accuracy of your prompt): At least one task with a [ground truth annotation](quality#Define-ground-truth-annotations-for-a-project). 

## API key

You can only specify one OpenAI API key per organization, and it only needs to be added once. 

Once added, it is automatically used for all new Prompts. 

To remove the key, click **API Keys** in the upper right of the Prompts page. You'll have the option to remove the key and add a new one. 

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

