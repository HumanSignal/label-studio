---
title: Set up Webhooks in Label Studio
short: Webhooks Setup
type: guide
order: 700
meta_title: Configure Webhooks in Label Studio
meta_description: Label Studio documentation for setting up and configuring webhooks to integrate Label Studio with your machine learning pipeline
---

Webhooks in Label Studio let you set up integrations that subscribe to certain events that occur inside Label Studio. When an event is triggered, Label Studio sends an HTTP POST request to the configured webhook URL. Your application or service can then respond to that event information however you want. You can use webhooks to perform actions like start model training, create a new version of a training dataset, trigger actions in your machine learning operations pipeline, and more.

Webhooks are organization-level (or are they project-level? I think they're actually project-level)

## Available Label Studio webhooks
Label Studio makes two main types of events available to integrate with webhooks: project events and task events.

### Project events
project created --> (create a new pipeline for data management?)
tasks imported --> (progress along in pipeline for data management?)
project published --> (progress along in pipeline for data annotation → ready for annotators)
project finished --> (start training ML model, export results via pipeline for training)

### Task events
annotation created --> (start training (active learning scenario))
annotation updated (skip+update) --> (start training (active learning scenario))

### Event reference

Expected format/content of what is sent from each event

When are the events sent? 
What data is included in each POST to the webhook URL?


GitHub Webhook docs list common info and common header info, then event-specific stuff separately:
https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#webhook-payload-object-common-properties
Seems like a good idea
https://docs.github.com/en/developers/webhooks-and-events/events/github-event-types


## How to integrate with webhooks

1. Create a webhook endpoint or URL on your server or as part of your application
2. Make sure your URL is accessible and can accept HTTP POST requests
3. Add it as a webhook URL in Label Studio

Your webhook endpoint needs to be able to:
1. read the event data
2. take action on the event data
3. send a 200 success message back to label studio (probably not tho)

### How to set up webhooks // Add a new webhook 

UI
1. Go to the webhooks page in settings
2. choose which types of events to trigger on? 
3. (In the “Post To URL” field, input the callback URL your application will use to accept the incoming webhook)(The payload URL is the URL of the server that will receive the webhook POST requests.)
4. add a description?
5. Save? 

The webhook URL must be set up to accept HTTP POST requests. 

How to test the connection to the URL? 

API

## What to use Label Studio webhooks for / When to use webhooks

Some events that happen in Label Studio happen in response to an API call. For those, the API response is sufficient to know that the action has occurred. But other events happen inside the Label Studio UI, such as project status changes and task activities. To find out immediately when those changes occur, you can use webhooks to notify your application or machine learning pipeline to take next steps. 

The actions your webhook takes in your application or pipeline can vary depending on the event. For example, you might use events sent to your webhook URL to do the following:
- Start training a machine learning model with a completed labeling project.
- Perform active learning after a task has been annotated.
- Prompt annotators to begin working on a project after it is fully set up.
- Create a new version of training data in a dataset versioning repository. 

Limit the number of requests to your server by subscribing only to the events relevant for your use case.


## Troubleshoot a webhook connection

From which IP addresses are events sent as POST payloads?
What if the webhook URL is inaccessible or can't be reached? How is that communicated?

Is there any way to test or ping a webhook URL after connecting? 

How do webhook requests back off if they fail? Do they? 
Can people authenticate the webhook requests at all?
Is there a limit to the number of webhooks someone can set up? 
How many times is an event sent to the webhook URL? Are events batched at all or always sent individually? 

Are webhook deliveries logged somewhere? Can they be retrieved via API? 
Any way to control or manage headers sent via webhook? 
Are there any differences between webhooks for LS and LSE? 

Do you need your API key or token to set up webhooks?


## Example: Start model training using webhook events

When project is complete → Start training model
When annotations are complete → Start training model






