---
title: Generate predictions from a prompt
short: Generate predictions from a prompt
tier: all
type: guide
order: 0
order_enterprise: 234
meta_title: Generate predictions
meta_description: description
section: Prompts
date: 2024-06-13 21:54:22
---

You can continue to save and evaluate your prompts until you reach your desired level of accuracy. 

!!! note
    Each time you click **Evaluate**, you generate a prediction for the tasks with ground truth annotation. Because you can have multiple models connected to the same project, this might result in multiple predictions for tasks. 


## Generate predictions for all tasks

When you are confident in your prompt, click **Get Predictions for All Tasks**. This may take some time to complete depending on how many tasks you have in your project. 

<video src="../images/prompts/predictions.mp4" controls="controls" style="max-width: 800px;" class="gif-border" />

Once complete, you can return to the project and open the Data Manager. Use the **Total predictions per task** column to confirm that each task has at least one prediction:

![Screenshot of the prediction preview](/images/prompts/prediction_column.png)

## Create annotations from predictions

Once you have your predictions in place, you still need to convert them to annotations. You can review predictions by opening tasks. The predictions are listed under the model name and are grayed out: 

![Screenshot of the prediction preview](/images/prompts/prediction.png)


From the Data Manager, select all the tasks you want to label and then select **Actions > Create Annotations from Predictions**. You are asked to select the model and version you want to use. 

SCREENSHOT