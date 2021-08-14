---
title: Set up webhooks in Label Studio
short: Webhooks Setup
type: guide
order: 650
meta_title: Configure Webhooks in Label Studio
meta_description: Label Studio documentation for setting up and configuring webhooks to integrate Label Studio with your machine learning pipeline
---

Webhooks in Label Studio let you set up integrations that subscribe to certain events that occur inside Label Studio. When an event is triggered, Label Studio sends an HTTP POST request to the configured webhook URL. Your application or service can then respond to that event information however you want. 

A `POST` request with some payload, for example:
```
{
    "action": "TASK_CREATED",
    "tasks": [
        {"id": 1, ...},
        ...
    ]
}
```

## What to use Label Studio webhooks for 

Some events that happen in Label Studio happen in response to an API call. For those, the API response is sufficient to know that the action has occurred. But other events happen inside the Label Studio UI, such as project changes and task annotation activities. To find out immediately when those changes occur, you can use webhooks to notify your application or machine learning pipeline to take specific actions. 

The actions your webhook takes in your application or pipeline can vary depending on the event. For example, you might use events sent to your webhook URL to do the following:
- Start training a machine learning model after a certain number of tasks have been annotated.
- Perform active learning after a task has been annotated.
- Prompt annotators to begin working on a project after it is fully set up.
- Create a new version of training data in a dataset versioning repository. 

Limit the number of requests to your server by subscribing only to the events relevant for your use case.

## Available Label Studio webhooks
Label Studio makes two main types of events available to integrate with webhooks: project-level task events and organization events.

<table>
  <tr>
    <th>Event Action</th>
    <th>Details</th>
    <th>Use Case</th>
  </tr>
  <tr>
    <td>Task Created</td>
    <td>For a specific project, triggers when new tasks are created. One event per task.</td>
    <td>Use to take action in your machine learning pipeline. </td>
  </tr>
  <tr>
    <td>Annotation Created</td>
    <td>For a specific project, triggers when new annotations are created for any tasks. One event per annotation.</td>
    <td>Use to start training in an active learning scenario.</td>
  </tr>
  <tr>
    <td>Annotation Updated</td>
    <td>For a specific project, triggers when an existing annotation is updated, overwritten, or when a task is skipped.</td>
    <td>Use to prompt model retraining. </td>
  </tr>
  <tr>
    <td>Annotations Deleted</td>
    <td>For a specific project, triggers when an annotation is deleted.</td>
    <td>Use to create a new version of a training dataset. </td>
  </tr>
  <tr>
    <td>Project Created</td>
    <td>For an organization, triggers when a project is created.</td>
    <td>Use to create a new pipeline for data management.</td>
  </tr>
  <tr>
    <td>Project Updated</td>
    <td>For an organization, triggers when project settings are updated, created, or saved.</td>
    <td>Use to update an existing data management pipeline.</td>
  </tr>
  <tr>
    <td>Project Deleted</td>
    <td>For an organization, triggers when a project is deleted.</td>
    <td>Use to remove a data management pipeline. </td>
  </tr>
</table>

## How to integrate with webhooks

To integrate with webhooks in Label Studio, you must do the following:
1. Create a webhook endpoint or URL as part of your application or machine learning model pipeline.
2. Make sure the webhook endpoint or URL is accessible to your Label Studio instance,  can accept HTTP POST requests.
3. [Add the webhook to Label Studio](webhooks.html#Add-a-new-webhook-in-Label-Studio).

Set up your webhook endpoint to read the event payload from Label Studio and take action based on the event.

## Add a new webhook in Label Studio

Set up a webhook URL in Label Studio and associate it with one or more event triggers. You can set up a webhook URL in the Label Studio UI, or using the API. You can configure as many webhook connections as you want, but too many might overwhelm your instance. 

### Add a webhook in Label Studio UI

Add a webhook URL to Label Studio. The webhook URL must be set up to accept HTTP POST requests.

1. In the Label Studio UI, open the project that you want to associate with a webhook URL.
2. Click **Settings** and click **Webhooks**.
3. Click **New Webhook**. 
4. In the **Payload URL** field, provide the URL to send event payloads to. 
5. (Optional) Toggle the **Is Active** option to deactivate the webhook until it is ready to use. Otherwise, the webhook becomes active as soon as you save it and events are sent to the URL.
6. (Optional) Add any headers required by the webhook URL. Specify the header name and the value. MUST BE AN ALPHANUMERIC STRING, CAN'T ADD MORE THAN 10. You can use headers to authenticate a request to your webhook URL.
7. Select whether to send a payload with the event. HERE'S WHAT HAPPENS IF YOU DON'T SEND A PAYLOAD.
8. Select whether to send an event for all actions in Label Studio supported by webhooks, or specific events. 
9. Save the webhook.

### Add a webhook using the Label Studio API

Make a POST request to the [Create a webhook](ADDLINKHERE) endpoint to add a webhook using the API. If you want to extend webhooks with custom events, see [Create a custom webhook event](webhook_create.html). 

## Troubleshoot a webhook connection

Webhook connections time out after 1 second. 

If the webhook URL is inaccessible by Label Studio, you can see this in a traceback in the logs. For example:
```
[2021-08-12 16:39:30,180] [root::run_webhook::32] [ERROR] HTTPConnectionPool(host='localhost', port=8888): Max retries exceeded with url: / (Caused by NewConnectio$Error('<urllib3.connection.HTTPConnection object at 0x7ff849ba1d90>: Failed to establish a new connection: [Errno 111] Connection refused'))
Traceback (most recent call last):                                
  File "/home/ch/work/label-studio/venv/lib/python3.8/site-packages/urllib3/connection.py", line 169, in _new_conn
    conn = connection.create_connection(
  File "/home/ch/work/label-studio/venv/lib/python3.8/site-packages/urllib3/util/connection.py", line 96, in create_connection
    raise err                                                                              
  File "/home/ch/work/label-studio/venv/lib/python3.8/site-packages/urllib3/util/connection.py", line 86, in create_connection
    sock.connect(sa)                                                                                   
ConnectionRefusedError: [Errno 111] Connection refused
```

Failed webhook connections are not retried. Successful webhook deliveries can be seen in the logs in DEBUG mode. For example:
```
[2021-08-12 17:02:34,703] [root::run_webhook::24] [DEBUG] Run webhook 1 for action ANNOTATION_UPDATED
[2021-08-12 17:02:34,704] [urllib3.connectionpool::_new_conn::227] [DEBUG] Starting new HTTP connection (1): localhost:8888
[2021-08-12 17:02:34,706] [urllib3.connectionpool::_make_request::452] [DEBUG] http://localhost:8888 "POST / HTTP/1.1" 200 2
```




