---
title: Create custom events for webhooks in Label Studio
short: Webhook development
type: guide
tier: all
order: 410
order_enterprise: 410
meta_title: Create Custom Webhooks in Label Studio
meta_description: Label Studio documentation for creating custom webhook event triggers to create custom integrations between Label Studio and your machine learning pipeline
section: "Integrate & Extend"
parent: "webhooks"
parent_enterprise: "webhooks"

---

If you want to trigger custom events for webhooks in Label Studio, you can extend the webhook event model.


## Create a custom webhook event

To create a custom webhook event, add your own action to the `WebhookActions` model.

For example:

```python
class WebhookAction(models.Model):
    ...
    SOMETHING_HAPPENED = 'SOMETHING_HAPPENED'
    ...
    ACTIONS = {
        SOMETHING_HAPPENED: {
            'name': _('Something happened'),
            'description': _("A thing happened. We wanted to let you know."),
            'key': 'something',
        },
        ...
    ...
```

After declaring the action and the associated properties and payload details in the `WebhookAction` class, call the event action in the code where it occurs. For example:

```
...python
result = do_something()
emit_webhooks(organization, WebhookAction.SOMETHING_HAPPENED, {'something': [result]})
...
```

You can retrieve the organization details using `Organization.objects.first()`.

### Call event actions with Python functions
There are several functions you can use to call event actions. Refer to the following table:

| Python function | When to use | Additional details |
| --- | --- | --- | 
| `get_active_webhooks()` | Get all active webhooks. | |
| `run_webhook()` | Run one webhook and pass some payload. | | 
| `emit_webhooks()` | Send requests for all webhooks for an action. | | 
| `emit_webhooks_for_instances()` | Send serialized instances with webhook requests. | You must declare a `serializer` in the `WebhookAction.ACTIONS` model.|
 

### Call event actions with decorators in API source code 

You can use decorators with the CRUD REST methods to send event actions to webhooks. You can use the following: 

| Decorator syntax | When to use | Details |
| --- | --- | --- | 
| `@api_webhook()` | `POST`/`PUT`/`PATCH` requests | Expects a response with an `id` and uses the `.get_object()` function after the request to send that information. |
| `@api_webhook_for_delete()` | `DELETE` | Sends only the `id` field after a successfully delete operation. | 








