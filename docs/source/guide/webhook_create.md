---
title: Create custom events for webhooks in Label Studio
short: Custom Webhooks
type: guide
order: 655
meta_title: Create Custom Webhooks in Label Studio
meta_description: Label Studio documentation for creating custom webhook event triggers to create custom integrations between Label Studio and your machine learning pipeline
---



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


