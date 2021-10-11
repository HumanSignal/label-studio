---
title: Set up active learning with Label Studio
short: Active learning loop
badge: <i class='ent'></i>
type: guide
order: 609
meta_title: Set up an active learning loop with Label Studio
meta_description: Set up an end-to-end active learning loop with Label Studio using the ML backend SDK and webhooks to perform model training and predictions and labeling seamlessly as part of your machine learning and data science workflow.
---

Follow this tutorial to set up an active learning loop with Label Studio. 

<div class="enterprise"><p>
Use Label Studio Enterprise Edition to build an automated active learning loop with a machine learning model backend. If you use the open source Community Edition of Label Studio, you can manually sort tasks and retrieve predictions to mimic an active learning process. If you're using Label Studio Community Edition, see <a href="#Customize-your-active-learning-loop">how to customize your active learning loop</a>.
</p></div>

## About Active Learning
Creating annotated training data for supervised machine learning models can be expensive and time-consuming. Active Learning is a branch of machine learning that seeks to **minimize the total amount of data required for labeling by strategically sampling observations** that provide new insight into the problem. In particular, Active Learning algorithms aim to select diverse and informative data for annotation, rather than random observations, from a pool of unlabeled data using **prediction scores**. For more about the practice of active learning, read [this article written by Heartex CTO on Towards Data Science](https://towardsdatascience.com/learn-faster-with-smarter-data-labeling-15d0272614c4).

## Set up an automated active learning loop

Continuously train and review predictions from a connected machine learning model using Label Studio. 

<br/><img src="/images/LS-active-learning.jpg" alt="Diagram of the active learning workflow described in surrounding text" class="gif-border" width="800px" height="244px" />

After a user creates an annotation in Label Studio, the configured webhook sends a message to the machine learning backend with the information about the created annotation. The fit() method of the ML backend runs to train the model. When the user moves on to the next labeling task, Label Studio retrieves the latest prediction for the task from the ML backend, which runs the predict() method on the task.

To set up this active learning, do the following: 
1. [Set up an ML model as an ML backend for active learning](#Set-up-an-ML-model-as-an-ML-backend-for-active-learning).
2. [Connect the ML backend for getting predictions to Label Studio](#Connect-the-ML-backend-to-Label-Studio-for-active-learning).
3. [Configure webhooks to send a training event to the ML backend](#Configure-webhooks-to-send-a-training-event-to-the-ML-backend). 
4. [Set up task sampling with prediction scores](#Set-up-task-sampling-with-prediction-scores).
5. [Label the tasks](#Label-the-tasks). 

As you label tasks, Label Studio sends webhook events to your machine learning backend and prompts it to retrain. As the model retrains, the predictions from the latest model version appear in Label Studio. 

## Set up an ML model as an ML backend for active learning

[Set up an example machine learning model as an ML backend](ml.html#Get-started-with-an-example-ML-backend), or [create a custom machine learning model](ml_create.html).

## Connect the ML backend to Label Studio for active learning

1. Follow the steps to [Add an ML backend to Label Studio](ml.html#Add-an-ML-backend-to-Label-Studio).
2. Under **ML-Assisted Labeling**, enable the setting to **Show predictions to annotators in the Label Stream and Quick View**. 

## Configure webhooks to send a training event to the ML backend


Note on this: ML backend doesn't require a payload to be sent along with the webhook event itself. But you can use it to retrieve project-related details (e.g. project ID) that might be useful in some cases:

retrieve data from Label Studio / connected storage via API
using project settings to define training hyperparameters
check project state for experiment tracking
(later we include links to all items' best practices)

1. In the Label Studio UI, open the project that you want to use for active learning.
2. Click **Settings > Webhooks**.
3. Click **Add Webhook**. 
4. Add the following URL as your **Payload URL**: `http://localhost:9090/webhook`
5. Leave the option to **Send payload** enabled.
6. Disable the option to **Send for all actions** and enable **Annotation created** and **Annotation updated**.
7. Click **Add Webhook**. 

## Set up task sampling with prediction scores

In order to maximize the training efficiency and effectiveness of your machine learning model, you want your annotators to focus on labeling the tasks with the least confident, or most uncertain, prediction scores from your model. To do make sure of that, [set up uncertainty task sampling](setup_project.html#Set-up-task-sampling).

## Label the tasks 

On the project data manager, select **Label All Tasks** to start labeling.

As your model retrains and a new version is updated in Label Studio, the tasks shown next to annotators are always those with the lowest prediction scores, reflecting those with the lowest model certainty. The predictions for the tasks correspond to the latest model version.

## Customize your active learning loop

If you want to change the behavior of the active learning loop, you can make manual changes.

- To change the version of the model used to show predictions to annotators, update it in the machine learning settings. See [Choose which predictions to show to annotators](ml.html#Choose-which-predictions-to-display-to-annotators).
- If you want to delete all predictions after your model is retrained, see how to [delete predictions](ml.html#Delete-predictions).
- If you need to retrieve and save predictions for all tasks, check recommendations for [retrieving predictions from a model](ml.html#Get-predictions-from-a-model).

### Set up manual active learning
If you're using Label Studio community edition, data annotators can't experience a live active learning loop. You can mimic an active learning experience by manually [retrieving predictions from a model](ml.html#Get-predictions-from-a-model) and by [sorting the tasks in the data manager by prediction score](labeling.html#Example-Sort-by-prediction-score) and selecting **Label Tasks As Displayed** when labeling tasks. However, the tasks won't automatically update the order as the machine learning backend trains with each new annotation. Because of this, you could perform batched active learning, where you annotate and train in batches rather than on-the-fly in an automated loop. 