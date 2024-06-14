---
title: Draft a prompt
short: Draft a prompt
tier: enterprise
type: guide
order: 0
order_enterprise: 231
meta_title: Draft a prompt
meta_description: Create and evaluate an LLM prompt
section: Prompts
date: 2024-06-12 14:09:09
---

With your [model created](prompts_model), you can begin drafting prompts. 

## Draft a prompt and generate predictions


1. Select your base model. For a description of all OpenAI models, see [Models overview](https://platform.openai.com/docs/models/models-overview).
2. In the **Prompt** field, enter your prompt. Keep in mind the following:
    * You must include the text field. (In the demo below, this is the `review` field.) Click the text field name to insert it into the prompt. 
    * Although not strictly required, you should provide definitions for each class. 
3. Click **Save**. 
4. Click **Evaluate**. 

!!! note
    When you click **Evaluate**, you will create predictions for each ground truth task. When you return to the project, you will see this reflected in the project. You can see how many predictions a task has using the **Predictions** column in the Data Manager. 

<br><br>
<video src="../images/prompts/prompts.mp4" controls="controls" style="max-width: 800px;" class="gif-border" />

## Drafting effective prompts

### Text placement

When you place your text class in the prompt (`review` in the demo above), this placeholder will be replaced by the actual text.

Depending on the length and complexity of your text, inserting it into the middle of another sentence or thought could potentially confuse the LLM. 

For example, instead of "*Classify `text` as one of the following:*", try to structure it instead as something like, "*Given the following text: `text`. Classify this text as one of the following:*." 

### Define your objective 

The first step is to clearly define the task you want to accomplish. Your prompt should explicitly state that the goal is to classify the given text into predefined categories. This sets clear expectations for the model. For instance, instead of a vague request like "Analyze this text," you should say, "Classify the following text into categories such as 'spam' or 'not spam'." Clarity helps the model understand the exact task and reduces ambiguity in the responses.

### Add context

Context is crucial in guiding the model towards accurate classification. Providing background information or examples can significantly enhance the effectiveness of the prompt. For example, if you are classifying customer reviews, include a brief description of what constitutes a positive, negative, or neutral review. You could frame it as, "Classify the following customer review as 'positive,' 'negative,' or 'neutral.' A positive review indicates customer satisfaction, a negative review indicates dissatisfaction, and a neutral review is neither overly positive nor negative." This additional context helps the model align its responses with your specific requirements.

### Specificity 

Specificity in your prompt enhances the precision of the model's output. This includes specifying the format you want for the response, any particular keywords or phrases that are important, and any other relevant details. For instance, "Please classify the following text and provide the category in a single word: 'positive,' 'negative,' or 'neutral.'" By being specific, you help ensure that the model's output is consistent and aligned with your expectations. 


