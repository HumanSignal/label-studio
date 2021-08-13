---
title: Set up Webhooks in Label Studio
short: Webhooks Setup
type: guide
order: 700
meta_title: Configure Webhooks in Label Studio
meta_description: Label Studio documentation for setting up and configuring webhooks to integrate Label Studio with your machine learning pipeline
---

Webhooks in Label Studio let you set up integrations that subscribe to certain events that occur inside Label Studio. When an event is triggered, Label Studio sends an HTTP POST request to the configured webhook URL. Your application or service can then respond to that event information however you want. You can use webhooks to perform actions like start model training, create a new version of a training dataset, trigger actions in your machine learning operations pipeline, and more.

Webhooks are organization-level and project-level for specific tasks.

## What to use Label Studio webhooks for / When to use webhooks

Some events that happen in Label Studio happen in response to an API call. For those, the API response is sufficient to know that the action has occurred. But other events happen inside the Label Studio UI, such as project status changes and task activities. To find out immediately when those changes occur, you can use webhooks to notify your application or machine learning pipeline to take next steps. 

The actions your webhook takes in your application or pipeline can vary depending on the event. For example, you might use events sent to your webhook URL to do the following:
- Start training a machine learning model with a completed labeling project.
- Perform active learning after a task has been annotated.
- Prompt annotators to begin working on a project after it is fully set up.
- Create a new version of training data in a dataset versioning repository. 

Limit the number of requests to your server by subscribing only to the events relevant for your use case.

// About webhooks blah

A webhook call is a `POST` request with some payload, for example:
```
{
    "action": "TASK_CREATED",
    "tasks": [
        {"id": 1, ...},
        ...
    ]
}
```

All webhook requests runs synchronously. They are stored in `Webhook` and `WebhookActions` models. They are explicitly called in code points as API controllers and etc.

## Available Label Studio webhooks
Label Studio makes two main types of events available to integrate with webhooks: task events and organization events.

### Task events 
MAKE THIS COMPREHENSIVE, IT'S INCOMPLETE ATM
- tasks imported --> (progress along in pipeline for data management?)
- annotation created --> (start training (active learning scenario))
- annotation updated (skip+update) --> (start training (active learning scenario))

### Organization events
These are turned off rn
- project created --> (create a new pipeline for data management?)
- project deleted
- project updated (mysterious what constitutes an update)(any project has been updated!)
- specific project updated (by ID subscribe)(not implemented)
// these don't exist rn
project published --> (progress along in pipeline for data annotation → ready for annotators)
project finished --> (start training ML model, export results via pipeline for training)
  
This is more advanced, hidden, etc.

### Event reference

It works according to algorithm and uses webhooks serialisers label_studio/webhooks/serializers_for_hooks.py. Also ACTIONS field in model.

Webhook's payload can be different.
But for now I try do it by declarative way. And I use ACTIONS to describe it. https://github.com/heartexlabs/label-studio/pull/1156/files#diff-ce7daadc1ac182002d7ea3d42e0a83f25061d208ab81e7fae7472378a455ef44R94 
Every webhook is run through run_webhook function https://github.com/heartexlabs/label-studio/pull/1156/files#diff-bf91bd7b648d9f117495b4b92cfc8b0399fbf465592318e2d94a0682eeaeed61R13 and as you can see: every payload has action key.
But of course it's not interesting and def emit_webhooks_for_instance(organization, project, action, instance=None) is mostly used in code to do it. (to be honest only it's used now) https://github.com/heartexlabs/label-studio/pull/1156/files#diff-bf91bd7b648d9f117495b4b92cfc8b0399fbf465592318e2d94a0682eeaeed61R71 
Project is required field here but it may be None (we have 2 kinds of webhooks: for organization and for project. If project is None it's organization webhook (global)).
So
and we serialize instance using ACTIONS metadata.
Сonsequently:
Now webhook's payload has: action key, project key (if it's project webhook), and key from ACTIONS with serialized instance (or list).
In the future we might get new kinds of webhooks so they would not use ACTIONS and would be imperative but now it fits into the declarative model.

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

https://stripe.com/docs/webhooks/best-practices

API




## Troubleshoot a webhook connection

From which IP addresses are events sent as POST payloads?
What if the webhook URL is inaccessible or can't be reached? How is that communicated?

Is there any way to test or ping a webhook URL after connecting? 

How do webhook requests back off if they fail? Do they? 
## Settings

All webhook requests

- `WEBHOOK_TIMEOUT` by default = `1.0`


From which IP addresses are events sent as POST payloads?
I depends on deployment case of label-studio host and webhook receiver and on network settings. I’m not sure I can answer on this question.

What if the webhook URL is inaccessible or can't be reached? How is that communicated?
Now this is just ignored. And you can see only TraceBack in logs:

[2021-08-12 16:39:30,180] [root::run_webhook::32] [ERROR] HTTPConnectionPool(host='localhost', port=8888): Max retries exceeded with url: / (Caused by NewConnectio$Error('<urllib3.connection.HTTPConnection object at 0x7ff849ba1d90>: Failed to establish a new connection: [Errno 111] Connection refused'))
Traceback (most recent call last):                                
  File "/home/ch/work/label-studio/venv/lib/python3.8/site-packages/urllib3/connection.py", line 169, in _new_conn
    conn = connection.create_connection(
  File "/home/ch/work/label-studio/venv/lib/python3.8/site-packages/urllib3/util/connection.py", line 96, in create_connection
    raise err                                                                              
  File "/home/ch/work/label-studio/venv/lib/python3.8/site-packages/urllib3/util/connection.py", line 86, in create_connection
    sock.connect(sa)                                                                                   
ConnectionRefusedError: [Errno 111] Connection refused
Implementation of this in code: Feature/webhooks by chiganov · Pull Request #1156 · heartexlabs/label-studio 

Unfortunately I didn't do clear interfaced error handling in this release

Is there any way to test or ping a webhook URL after connecting?
Unfortunately in this release, no.


How do webhook requests back off if they fail? Do they?
They don’t. Only logs.  


Can people authenticate the webhook requests at all?
They can use headers.


Is there a limit to the number of webhooks someone can set up?
No (for open source), I think they can ruin their instances if they want through adding infinite number of webhooks. But you are right. In LSE we have to limit it.


How many times is an event sent to the webhook URL? Are events batched at all or always sent individually?Individualy (for open source). And it happens on API requests from users. In LS it’s going synchronously, before they get response. But in LSE we will have to do it with delay not in API process.


Are webhook deliveries logged somewhere?
You can see somthing like that in logs in DEBUG mod.

[2021-08-12 17:02:34,703] [root::run_webhook::24] [DEBUG] Run webhook 1 for action ANNOTATION_UPDATED
[2021-08-12 17:02:34,704] [urllib3.connectionpool::_new_conn::227] [DEBUG] Starting new HTTP connection (1): localhost:8888
[2021-08-12 17:02:34,706] [urllib3.connectionpool::_make_request::452] [DEBUG] http://localhost:8888 "POST / HTTP/1.1" 200 2
Can they be retrieved via API?
I did API for webhooks. (If I gou you right)


But I didn’t do sending webhook id  in payload for this release.

Any way to control or manage headers sent via webhook?
Yes, we can set static headers in the interface.

Are there any differences between webhooks for LS and LSE?

Yes. The main difference for now: we don’t have webhooks in LSE  . Only LS. I wrote a few points about how it is supposed to be but it’s not implemented yet. Even not designed.





## Create a custom webhook event

## How to extend webhooks 

To do that you need to add your own action to `WebhookActions` model. 
For example:

```
class WebhookAction(models.Model):
    ...
    SOMETHING_HAPPENED = 'SOMETHING_HAPPENED'
    ...
    ACTIONS = {
        SOMETHING_HAPPENED: {
            'name': _('Something happened'),
            'description': _("Something was going ok or not, Nobody knows."),
            'key': 'something',
        },
        ...
    ...
```

And now you have to add explicitly call in some place where you need it:

```
...
result = do_something()
emit_webhooks(organization, WebhookAction.SOMETHING_HAPPENED, {'something': [result]})
...
```

> Note: In OpenSorce you have only one organization so you can easly get it by following code: `Organization.objects.first()`


## Calling of webhooks
### Raw calling
- `get_active_webhooks()`
  Use it to get all active webhooks.
- `run_webhook()`
  Use it to run one and pass some payload here.
- `emit_webhooks()`
  Use it to send requests for all webhooks for an action.

### Calling with instances
- `emit_webhooks_for_instanses()`
  So as usualy we want to send serialized instances there is function `emit_webhooks_for_instanses()`. Be sure you have `serializer` in `WebhookAction.ACTIONS` field.

### Calling in API views
Usually, we have many CRUD REST methods in API. So There are 2 decorators to make it easier: 

- `@api_webhook()` 
  It's used for `POST`/`PUT`/`PATCH` requests. The decorator expects that responce will be with `id` field and uses `.get_object()` after request to send it.

- `@api_webhook_for_delete()`
  Is's used only for `DELETE` and sends only `id` field after successful operation.


