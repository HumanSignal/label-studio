---
title: Set up active learning with Label Studio
short: Active learning loop
type: guide
order: 609
meta_title: Set up an active learning loop with Label Studio
meta_description: Set up an end-to-end active learning loop with Label Studio using the ML backend SDK and webhooks to perform model training and predictions and labeling seamlessly as part of your machine learning and data science workflow.
---

Follow this tutorial to set up an active learning loop with Label Studio. 

## About Active Learning
Creating annotated training data for supervised machine learning models can be expensive and time-consuming. Active Learning is a branch of machine learning that seeks to **minimize the total amount of data required for labeling by strategically sampling observations** that provide new insight into the problem. In particular, Active Learning algorithms aim to select diverse and informative data for annotation, rather than random observations, from a pool of unlabeled data using **prediction scores**. For more about the practice of active learning, read [this article written by Heartex CTO on Towards Data Science](https://towardsdatascience.com/learn-faster-with-smarter-data-labeling-15d0272614c4).

## Set up an automated active learning loop

Continuously train and review predictions from a connected machine learning model using Label Studio. 

<br/><img src="/images/LS-active-learning.jpg" alt="Diagram of the active learning workflow described in surrounding text" class="gif-border" width="800px" height="244px" />

After a user creates an annotation in Label Studio, the configured webhook sends a message to the machine learning backend with the information about the created annotation. The RQ background job starts the training job, and the fit() method of the ML backend runs. The JSON annotation result is stored in Redis and updates the model version and the model artifacts. The init() method loads the model and artifacts. When the user moves on to the next labeling task, the API call to retrieve the next task starts a prediction job and retrieves the latest model version and the latest prediction for the task from the ML backend.

To set up this active learning, do the following: 
1. [Set up an ML model as an ML backend for active learning](#Set-up-an-ML-model-as-an-ML-backend-for-active-learning).
2. [Connect the ML backend to Label Studio](#Connect-the-ML-backend-to-Label-Studio-for-active-learning).
3. [Configure Label Studio to send the ML backend webhook events](#Configure-Label-Studio-to-send-the-ML-backend-webhook-events). 
4. [Set up labeling ordering with prediction scores](#Set-up-labeling-ordering-with-prediction-scores).
5. [Label the tasks as displayed in the data manager](#Label-the-tasks-as-displayed-in-the-data-manager). 

As you label tasks, Label Studio sends webhook events to your machine learning backend and prompts it to retrain. As the model retrains, the predictions from the latest model version appear in Label Studio. 

## Set up an ML model as an ML backend for active learning

[Set up an example machine learning model as an ML backend](ml.html#Get-started-with-an-example-ML-backend), or [create a custom machine learning model](ml_create.html).

## Connect the ML backend to Label Studio for active learning

1. Follow the steps to [Add an ML backend to Label Studio](ml.html#Add-an-ML-backend-to-Label-Studio).
2. Under **ML-Assisted Labeling**, enable the following settings:
   - Start model training after any annotations are submitted or updated
   - Retrieve predictions when loading a task automatically
   - Show predictions to annotators in the Label Stream and Quick View

## Configure Label Studio to send the ML backend webhook events. 

1. In the Label Studio UI, open the project that you want to use for active learning.
2. Click **Settings > Webhooks**.
3. Click **Add Webhook**. 
4. Add the following URL as your **Payload URL**: `http://localhost:9090/webhook`
5. Leave the option to **Send payload** enabled.
6. Disable the option to **Send for all actions** and enable **Annotation created** and **Annotation updated**.
7. Click **Add Webhook**. 

## Set up labeling ordering with prediction scores

In order to maximize the training efficiency and effectiveness of your machine learning model, you want your annotators to focus on labeling the tasks with the least confident, or most uncertain, prediction scores from your model.

   - If you're using Label Studio Enterprise or Teams, [set up uncertainty task sampling](setup_project.html#Set-up-task-sampling).
   - If you're using Label Studio, [sort the tasks in the data manager by prediction score](labeling.html#Example-Sort-by-prediction-score).

## Label the tasks as displayed in the data manager

On the project data manager, select **Label Tasks As Displayed** to start labeling.

As your model retrains and a new version is updated in Label Studio, the tasks shown next to annotators are always those with the lowest prediction scores, reflecting those with the lowest model certainty. The predictions for the tasks correspond to the latest model version.

## Customize your active learning loop

If you want to change the behavior of the active learning loop, you can make manual changes.

- To change the version of the model used to show predictions to annotators, update it in the machine learning settings. See [Choose which predictions to show to annotators](ml.html#Choose-which-predictions-to-display-to-annotators).
- If you want to delete all predictions after your model is retrained, see how to [delete predictions](ml.html#Delete-predictions).
- If you need to retrieve and save predictions for all tasks, check recommendations for [retrieving predictions from a model](ml.html#Get-predictions-from-a-model).