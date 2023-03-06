---
title: Ping Federate & Ping Identity SAML SSO Setup Example
short: Ping Federate & Ping Identity & PingOne SAML SSO Setup
tier: enterprise
order: 253
meta_title: Ping Federate & Ping Identity & PingOne SAML SSO Setup Example
meta_description: Label Studio Enterprise documentation for setting up Ping Federate & Ping Identity & PingOne SAML SSO Setup Example.
hide_sidebar: true
---

## PingOne Configuration

### Add new application 

1. Click blue circle with the `+` sign.  
<img src="/images/pingone/setup-1.png" class="gif-border">

2. Select `Manual Enter`, enter URLs from the Label Studio Enterprise SAML SSO page.
<img src="/images/pingone/setup-2.png" class="gif-border">

3. The result
<img src="/images/pingone/main.png" class="gif-border">


### Overview Tab

<img src="/images/pingone/overview.png" class="gif-border">
<br><br>

### Configuration Tab

<img src="/images/pingone/configuration-1.png" class="gif-border">
<br><br>

<img src="/images/pingone/configuration-2.png" class="gif-border">
<br><br>

### Attributes Tab

You should use this group value in mapping:
```
Expression: ${user.memberOfGroupNames == null ? '': #string.join(user.memberOfGroupNames, ',')}
```
<br>
<img src="/images/pingone/attributes.png" class="gif-border">
<br><br>

### Policies Tab

<img src="/images/pingone/policies.png" class="gif-border">
<br><br>

### Access Tab

<img src="/images/pingone/access.png" class="gif-border">

## Users & Groups

!!! warning
    All users should have at least one group, otherwise it will lead to the login error.
     

## Label Studio Enterprise Settings 

You can find LSE SAML SSO settings on the **Organization** page >> **SAML SSO**. You are able to map user roles and workspaces with `Groups` attribute.  
 
<br>
<img src="/images/pingone/saml-settings.png" class="gif-border">


## Login using SSO 

Now you are able to login using your SSO session, write your company domain on the SSO Login page:

<br>
<img src="/images/pingone/login-sso.png" class="gif-border">

Administrators can find the domain on the SAML SSO page:

<br>
<img src="/images/pingone/domain-settings.png" class="gif-border">
