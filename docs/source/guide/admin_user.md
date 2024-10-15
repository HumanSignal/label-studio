---
title: Add users to Label Studio Enterprise
short: Add users
tier: enterprise
type: guide
order: 0
order_enterprise: 369
meta_title: Add and invite users to Label Studio
meta_description: Overview of how you can add users to Label Studio Enterprise
section: "Manage Your Organization"
parent: "manage_users"
parent_enterprise: "manage_users"
date: 2024-02-05 17:15:19
---

## Create the initial organization account

When creating a new organization, you must sign up directly without an invite link. The user who creates the new account will have the Owner role. 

For on-prem deployments, use `/user/signup`. 

For SaaS deployments, use [`app.heartex.com/user/trial`](https://app.heartex.com/user/trial).

!!! note
    There can only be one Owner per organization. If the user in control of the Owner account leaves, you will need to [open a support ticket](https://support.humansignal.com/hc/en-us/requests/new) to request that this role be reassigned. 

!!! info Tip

    Depending on how you sign up, the new organization is named using the Owner's email. You can change the name of the organization through the API: 

    `curl -X PATCH -H "Content-Type: application/json" -H "Authorization: Token your_api_token" -d '{"title": "new title"}' <https://your-api-url.com/api/organization/>`


#### Require invites for new users

While you can invite users to join your organization with the invite link, this does not prevent users from registering new account through the signup page (for on-prem deployments).

You can remove the option to create accounts through the `/user/signup` page by setting the following environment variable:

```bash
LABEL_STUDIO_DISABLE_SIGNUP_WITHOUT_LINK=true
```

Users will only be able to sign up through an invitation link or email. 


## Invite users to Label Studio Enterprise

Once the initial organization account is created, you can begin inviting users:

1. Open Label Studio and click the menu in the upper left. 
2. Select **Organization**. 

    If you do not see the **Organization** option, you do not have access to the Organization page. Only users in the Owner or Administrator role can access this page. 
3. From the Organization page, click **Invite People**. 

From here you have two options:

* **Invite link**  
You can share this link with users, who can then complete the registration process. However, they will be unable to access Label Studio until an Owner or Administrator manually assigns them a role. See [User roles and permissions](admin_roles). 

    Click **Reset Link** to reset the link. When reset, anyone who have the old link will be unable to register a new user account. 

* **Invite via email**  
Enter a list of email addresses separated by commas and then select a user role for the new accounts. Users will receive an email with a link to create their Label Studio account, and will be able to access Label Studio as soon as their registration is complete. 


## Statuses of user accounts

!!! note
    `NOT_ACTIVATED` status is equal to `Pending` status.

If a user is in `Pending` status then it means he was invited and signed up for the account, but his role is not defined by administrator.

If you assign `Deactivate` to a role then it means you free one seat in license and a deactivated user doesn't have access to your organization.