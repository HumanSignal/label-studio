---
title: Access tokens
short: Access tokens
tier: all
type: guide
order: 381
order_enterprise: 359
meta_title: Access tokens
meta_description: Access tokens to interact with the Label Studio API and SDK. 
section: "Manage Your Organization"
date: 2025-02-18 12:03:59
parent_enterprise: "admin_settings"
---

Label Studio has personal access tokens and legacy tokens. These tokens are also referred to as your "API keys." 

<table>
<thead>
  <tr>
    <th>Personal Access Token</th>
    <th>Legacy Token</th>
  </tr>
  </thead>
  <tr>
  <td>
    <ul>
        <li>Have a TTL that can be set at the org level. (Label Studio Enterprise only)
        <li>Are only visible to users once
        <li>JWT refresh tokens
        <li>Can be manually revoked
        <li>Require <a href="#HTTP-API">extra steps</a> when used with HTTP API
        <li> <code>-H 'Authorization: Bearer &lt;token&gt;'</code> with HTTP API requests
        <li>Only need to be set once when used with the SDK
    </ul>
  </td>
  <td>
    <ul>
        <li>Does not expire
        <li>Remains listed and available in your account settings
        <li>Can be manually revoked
        <li>Do not need to be refreshed with used with HTTP API
        <li> <code>-H 'Authorization: Token  &lt;token&gt;'</code> with HTTP API requests
        <li>Only need to be set once when used with the SDK
    </ul>
  </td>
  </tr>
</table>

## Find your access tokens

You can access your API keys/access tokens by clicking your user icon in the upper right and selecting **Account & Settings**. 

If you do not see either the **Personal Access Tokens** or **Legacy Tokens** page, that means you first need to enable them for your organization.

## Enable access tokens for an organization

The options that users see on their **Account & Settings** page depend on your settings at the organization level. 

From the **Organization** page, select **Settings > Access Token Settings**. 

<div class="enterprise-only">

!!! note
    The **Organization** page is only available to users in the Admin and Owner role.

</div>

From here you can enable and disable token types. 

* When a certain token type is disabled, existing tokens will not be able to authenticate to the Label Studio platform. 

* Use the Personal Access Token Time-to-Live to set an expiration date for personal access tokens. (Enterprise only)

<div class="enterprise-only">

<img src="/images/admin/token-settings.png" style="max-width: 668px" alt="Screenshot of Access Token window">

</div>

<div class="opensource-only">

<img src="/images/admin/token-settings-lso.png" style="max-width: 475px" alt="Screenshot of Access Token window">

</div>

## "API keys" vs. "Access tokens"

In Label Studio, **"access tokens"** and **"API keys"** mean the same thing and are used interchangeably. 

## Personal access tokens

### SDK

Personal access tokens can be set directly in the script or set as the `LABEL_STUDIO_API_KEY` environment variable. 

```python
# Define the URL where Label Studio is accessible and the API key for your user account
LABEL_STUDIO_URL = 'http://localhost:8080'

# API key can be either your PAT or legacy access token
LABEL_STUDIO_API_KEY = 'your-token'

# Import the SDK and the client module
from label_studio_sdk import LabelStudio

# Connect to the Label Studio API 
client = LabelStudio(base_url=LABEL_STUDIO_URL, api_key=LABEL_STUDIO_API_KEY)

```

### HTTP API

Because this is a JWT refresh token, you must use your PAT to generate a short-lived access token. This access token is then used for API authentication.

To generate this access token, make a POST request with your personal access token in the JSON body. For example:
     
```bash
curl -X POST <your-label-studio-url>/api/token/refresh \
-H "Content-Type: application/json" \
-d '{"refresh": "your-personal-access-token"}'
```

In response, you will receive a JSON payload similar to:
     
```json
{
    "access": "your-new-access-token"
}
```

Use this access token by including it in your API requests via the `Authorization: Bearer` header. For example:
     
```http
curl -X <method> <Label Studio URL>/api/<endpoint> -H 'Authorization: Bearer your-new-access-token'
```

When that access token expires (after around 5 minutes) you’ll get a 401 response, and will need to use your personal access token again to acquire a new one. This adds an extra layer of security.

You can also check when the token is set to expire using the following script:

```python
# pip install pyjwt
from datetime import datetime, timezone
import jwt

decoded = jwt.decode(token)
exp = decoded.get("exp")
token_is_expired = (exp <= datetime.now(timezone.utc).timestamp())
```


## Legacy tokens

Generally speaking, the legacy tokens are not as secure as personal access tokens because they must be manually revoked. 

### SDK

There is no difference in how you use legacy tokens and personal access tokens with the Python SDK. See the example above. 


### HTTP API

Use this access token by including it in your API requests via the `Authorization: Token` header (this is different than the `Authorization: Bearer` header used with personal access tokens).

For example:
     
```bash
curl -X <method> <Label Studio URL>/api/<endpoint> -H 'Authorization: Token <token>
```
