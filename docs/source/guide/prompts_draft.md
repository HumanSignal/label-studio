---
title: Draft and run prompts
short: Draft and run prompts
tier: enterprise
type: guide
order: 0
order_enterprise: 231
meta_title: Draft your Prompt
meta_description: Create and evaluate an LLM prompt
section: Prompts
date: 2024-06-12 14:09:09
---

With your [Prompt created](prompts_create), you can begin drafting your prompt content to run against baseline tasks.

## Draft a prompt and generate predictions


1. Select your base model. 

    The models that appear depend on the [API keys](prompts_create#Model-provider-API-keys) that you have configured for your organization. If you have added an OpenAI key, then you will see all supported OpenAI models. If you have added Azure OpenAI keys, then you will see one model per each deployment that you have added. 
    
    For a description of all OpenAI models, see [OpenAI's models overview](https://platform.openai.com/docs/models/models-overview).
2. In the **Prompt** field, enter your prompt. Keep in mind the following:
    * You must include the text class. (In the demo below, this is the `review` class.) Click the text class name to insert it into the prompt. 
    * Although not strictly required, you should provide definitions for each class to ensure prediction accuracy and to help [add context](#Add-context). 
3. Select your baseline:
   * **All Project Tasks** - Generate predictions for all tasks in the project. Depending on the size of your project, this might take some time to process. This does not generate an accuracy score for the prompt. 
   
        See the [Bootstrapping projects with prompts](prompts_overview#Bootstrapping-projects-with-Prompts) use case.
   * **Sample Tasks** - Generate predictions for the first 20 tasks in the project. This does not generate an accuracy score for the prompt. 
   
        See the [Bootstrapping projects with prompts](prompts_overview#Bootstrapping-projects-with-Prompts) use case.
   * **Ground Truths** - Generate predictions and a prompt accuracy score for all tasks with ground truth annotations. This option is only available if your project has ground truth annotations. 
   
        See the [Auto-labeling with Prompts](prompts_overview#Auto-labeling-with-Prompts) use case and the [Prompt evaluation and fine-tuning](prompts_overview#Prompt-evaluation-and-fine-tuning). 
4. Click **Save**. 
5. Click **Evaluate** (if running against a ground truth baseline) or **Run**. 

!!! warning
    When you click **Evaluate** or **Run**, you will create predictions for each task in the baseline you selected and overwrite any previous predictions you generated with this prompt. 
    
    Evaluating your Prompts can result in multiple predictions on your tasks: if you have multiple Prompts for one Project, or if you click both **Evaluate**/**Run** and **Get Predictions for All Tasks from a Prompt**, you will see multiple predictions for tasks in the Data Manager. 

<br><br>
<video src="../images/prompts/prompts.mp4" controls="controls" style="max-width: 800px;" class="gif-border" />

## Drafting effective prompts

For a comprehensive guide to drafting prompts, see [The Prompt Report: A Systematic Survey of Prompting Techniques](https://arxiv.org/abs/2406.06608) or OpenAI's guide to [Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering). 

### Text placement

When you place your text class in the prompt (`review` in the demo above), this placeholder will be replaced by the actual text.

Depending on the length and complexity of your text, inserting it into the middle of another sentence or thought could potentially confuse the LLM. 

For example, instead of "*Classify `text` as one of the following:*", try to structure it as something like, "*Given the following text: `text`. Classify this text as one of the following:*." 

### Define your objective 

The first step to composing an effective prompt is to clearly define the task you want to accomplish. Your prompt should explicitly state that the goal is to classify the given text into predefined categories. This sets clear expectations for the model. For instance, instead of a vague request like "Analyze this text," you should say, "Classify the following text into categories such as 'spam' or 'not spam'." Clarity helps the model understand the exact task and reduces ambiguity in the responses.

### Add context

Context is crucial in guiding the model towards accurate classification. Providing background information or examples can significantly enhance the effectiveness of the prompt. For example, if you are classifying customer reviews, include a brief description of what constitutes a positive, negative, or neutral review. You could frame it as, "Classify the following customer review as 'positive,' 'negative,' or 'neutral.' A positive review indicates customer satisfaction, a negative review indicates dissatisfaction, and a neutral review is neither overly positive nor negative." This additional context helps the model align its responses with your specific requirements.

### Specificity 

Specificity in your prompt enhances the precision of the model's output. This includes specifying the format you want for the response, any particular keywords or phrases that are important, and any other relevant details. For instance, "Please classify the following text and provide the category in a single word: 'positive,' 'negative,' or 'neutral.'" By being specific, you help ensure that the model's output is consistent and aligned with your expectations. 


