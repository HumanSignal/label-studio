---
title: Prompts overview and use cases
short: Overview and use cases
tier: enterprise
type: guide
order: 0
order_enterprise: 225
meta_title: Prompts overview
meta_description: An overview of the Prompts feature on the HumanSignal platform
section: Prompts
date: 2024-05-15 14:30:14
---

Use Prompts to evaluate and refine your LLM prompts and then generate predictions to automate your labeling process. 

All you need to get started is an OpenAI API key and a project. 

With Prompts, you can:

* Drastically improve the speed and efficiency of annotations, transforming subject matter experts (SMEs) into highly productive data scientists while reducing the dependency on non-SME manual annotators.
* Increase annotation throughput, accuracy, and consistency, making the process faster and more scalable. 
* Empower users to harness the full potential of AI-driven text labeling, setting a new standard for efficiency and innovation in data labeling.
* Leverage subject matter expertise to rapidly bootstrap projects with labels, allowing you to decrease time to ML development. 
* Allow your subject matter experts time focus on higher-level tasks rather than being bogged down by repetitive manual work.


## Use cases


### Auto-labeling with Prompts
 
Prompts allows you to leverage LLMs to swiftly generate accurate predictions, enabling instant labeling of thousands of tasks. 

By utilizing AI to handle the bulk of the annotation work, you can significantly enhance the efficiency and speed of your data labeling workflows. This is particularly valuable when dealing with large datasets that require consistent and accurate labeling. Automating this process reduces the reliance on manual annotators, which not only cuts down on labor costs but also minimizes human errors and biases. With AI's ability to learn from the provided ground truth annotations, you can maintain a high level of accuracy and consistency across the dataset, ensuring high-quality labeled data for training machine learning models.

#### Workflow

1. If you don't already have one, create a project and import a text-based dataset. 

    * [Create a project](setup_project)
    * [Sync data from external storage](storage)
2. Annotate a subset of tasks, marking as many as possible as ground truth annotations. The more data you have for the prompt evaluation, the more confident you can be with the results.

    If you want to skip this step, see the [bootstrapping use case](#Bootstrapping-projects-with-prompts) outlined below. 

    * [Labeling guide](labeling)
    * [Define ground truth annotations for a project](quality#Define-ground-truth-annotations-for-a-project)
    * [Blog - What's a ground truth dataset?](https://humansignal.com/blog/what-s-a-ground-truth-dataset/)
3. Go to the Prompts page and create a new Prompt. If you haven't already, you will also need to add an OpenAI API key.

    * [Create a Prompt](prompts_create)
    * [Where do I find my OpenAI API Key?](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)
4. Write a prompt and evaluate it against your ground truth dataset. 

    * [Draft a prompt](prompt_draft)
5. When your prompt is returning an overall accuracy that is acceptable, you can choose to apply it to the rest of the tasks in your project. 

    * [Generate predictions from a prompt](prompts_predictions)

![Diagram of auto-labeling workflow](/images/prompts/prompter-diagram.png)

### Bootstrapping projects with Prompts

In this use case, you do not need a ground truth annotation set. You can use Prompts to generate predictions for tasks without returning accuracy scores for the predictions it generates. 

This use case is ideal for organizations looking to kickstart new initiatives without the initial burden of creating extensive ground truth annotations, allowing you to start analyzing and utilizing your data immediately. This is particularly beneficial for projects with tight timelines or limited resources.

By generating predictions and converting them into annotations, you can also quickly build a labeled dataset, which can then be refined and improved over time with the help of subject matter experts. This approach accelerates the project initiation phase, enabling faster experimentation and iteration. 

Additionally, this workflow provides a scalable solution for continuously expanding datasets, ensuring that new data can be integrated and labeled efficiently as the project evolves.

!!! note
    You can still follow this use case even if you already have ground truth annotations. You will have the option to select a task sample set without taking ground truth data into consideration. 


#### Workflow

1. If you don't already have one, create a project and import a text-based dataset. 

    * [Create a project](setup_project)
    * [Sync data from external storage](storage)
2. Go to the Prompts page and create a new Prompt. If you haven't already, you will also need to add an OpenAI API key.

    * [Create a Prompt](prompts_create)
    * [Where do I find my OpenAI API Key?](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)
3. Write a prompt and run it against your task samples. 
    * [Draft a prompt](prompt_draft)
  
When you run your prompt, you create predictions for the selected sample (this can be a portion of the project tasks or all tasks). From here you have several options:

* Continue to work on your prompt and generate new predictions each time you run it against your sample. 
* Return to the project and begin reviewing your predictions. If you convert your predictions into annotations, you can use subject matter experts and annotators to begin interacting with those the annotations. 
* As you review the annotations, you can identify ground truths. With a ground truth dataset, you can further refine your prompt using its accuracy score. 

![Diagram of bootstrap workflow](/images/prompts/boostrap-diagram.png)

### Prompt evaluation and fine-tuning

As you evaluate your prompt against the ground truth annotations, you will be given an accuracy score for each version of your prompt. You can use this to iterate your prompt versions for [clarity, specificity, and context](prompts_draft#Drafting-effective-prompts). 

![Screenshot of accuracy score](/images/prompts/accuracy_score.png)

This accuracy score provides a measurable way to evaluate and refine the performance of your prompt. By tracking accuracy, you can ensure that the automated labels generated by the LLM are consistent with ground truth data. 

This feedback loop allows you to iteratively fine-tune your prompts, optimizing the accuracy of predictions and enhancing the overall reliability of your data annotation processes. In industries where data accuracy directly impacts decision-making and operational efficiency, this capability is invaluable.

#### Workflow

1. If you don't already have one, create a project and import a text-based dataset. 

    * [Create a project](setup_project)
    * [Sync data from external storage](storage)
2. Annotate a subset of tasks, marking as many as possible as ground truth annotations. The more data you have for the prompt evaluation, the more confident you can be with the results.

    * [Labeling guide](labeling)
    * [Define ground truth annotations for a project](quality#Define-ground-truth-annotations-for-a-project)
    * [Blog - What's a ground truth dataset?](https://humansignal.com/blog/what-s-a-ground-truth-dataset/)
3. Go to the Prompts page and create a new Prompt. If you haven't already, you will also need to add an OpenAI API key.

    * [Create a Prompt](prompts_create)
    * [Where do I find my OpenAI API Key?](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)
4. Write a prompt and evaluate it against your ground truth dataset. 

    * [Draft a prompt](prompt_draft)
5. Continue iterating and refining your prompt until you reach an acceptable accuracy score. 

![Diagram of fine-tuning workflow](/images/prompts/tuning-diagram.png)

## Features, requirements, and constraints

<div class="noheader rowheader">

| Feature | Support |
| --- | --- |
| **Supported data types** | Text |
| **Supported model types** | Text Classification <br>Named Entity Recognition (NER) |
| **Class selection** | Single selection (the LLM can apply one label per task)|
| **Supported base models** | OpenAI gpt-3.5-turbo-16k <br>OpenAI gpt-3.5-turbo-instruct* <br>OpenAI gpt-4-turbo <br>OpenAI gpt-3.5-turbo <br>OpenAI gpt-4o <br>OpenAI gpt-4 <br><br>* This model is not supported via Azure OpenAI|
| **Text compatibility** | Task text must be utf-8 compatible |
| **Task size** | Total size of each task can be no more than 1MB (approximately 200-500 pages of text) |
| **Required permissions** | **Owners, Administrators, Managers** -- Can create Prompt models and update projects with auto-annotations. Managers can only apply models to projects in which they are already a member. <br><br>**Reviewers and Annotators** -- No access to the Prompts tool, but can see the predictions generated by the prompts from within the project (depending on your [project settings](project_settings_lse)).  |
| **Enterprise vs. Open Source** | Label Studio Enterprise (Cloud only)|

</div>




