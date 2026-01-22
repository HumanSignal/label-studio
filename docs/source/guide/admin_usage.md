---
title: Usage & License
short: Usage & License
type: guide
tier: enterprise
order: 0
order_enterprise: 358
meta_title: Usage & License
meta_description: Find information about your Label Studio account and configure organization settings.  
section: "Manage Your Organization"
parent_enterprise: "admin_settings"
---

You can find information about your plan and seat usage on this page. 

## Label Studio Enterprise

### Seats in use

Here you can see the number of seats compared with the number of active users. 

Each organization has a set amount of Label Studio seats in their license. To increase your seats, contact your HumanSignal account representative. 

### License info

This section includes general information about your Label Studio license, such as when it was issued and when it expires. 

It also includes the following usage information:

<dl>
<dt>Projects</dt>
<dd>

**Cloud/SaaS:** Every project that belongs to your current organization, regardless of state (draft/published) or workspace (meaning that it includes sandbox projects). 

**On-prem:** All projects on your server, regardless of state workspace. 
</dd>

<dt>Results</dt>
<dd>

The total number of labeled regions (results) that your organization has created across all projects. A result is one item in an annotation’s result array — a bounding box, text span, relation between regions, etc. 
</dd>
</dl>

### Security 

Only the org Owner can update these settings.

<dl>
<dt>Session Timeout Policy</dt>
<dd>

| Field          | Description    |
| ------------- | ------------ |
| **Max session age (minutes)**         | How many minutes a user can be idle. If they exceed this limit, they are automatically logged out the next time they trigger a request. <br> Any interaction that hits the backend (clicks that trigger API calls, saves, polling, etc.) resets this timer. |
| **Max time between activity (minutes)** | Absolute session lifetime. Regardless of activity, a session cannot last longer than this many minutes from login; once reached, the user must re-authenticate. |

</dd>

<dt>Single Sign-On (SSO) enabled</dt>
<dd>
This indicates with your organization can use SSO. 

SSO is not available if you are in a trial organization or if it is not enabled for your license. 

</dd>
</dl>

### Embedding

 You can use these fields to set up [Label Studio Embeds](embed#Configure-embedding-in-Label-Studio). 

!!! note
    Embedding is not available to all customers. Contact your [HumanSignal account manager](mailto:sales@humansignal.com) to enable.

### Features

Only the org Owner can update these settings and request access.

The features can be requested and enabled for your license. 

| Field          | Description    |
| ------------- | ------------ |
| **Invite external annotators to projects**  | When enabled, your organization can send email invites to contractors/partners to give them project-scoped access (Annotator role). <br> When not enabled, only existing org members can be added to projects; you’d provision any new users through your normal onboarding (e.g., SSO/SCIM) first. |
| **Access to Activity Log** | Whether your organization has access to [activity logs](admin_logs). |
| **Prompts** | Whether your organization has access to [Prompts](prompts_overview). |
| **Whitelabel** | Whether your organization has whitelabeling enabled. |
| **Plugins** | Toggle whether your organization has access to plugins. And, if enabled, whether users in the Manager role can create and update them. |
| **Early Adopter** | Opt-in to new features before they're released to the public. |
| **Enable Storage Proxy** | Allow Label Studio to [proxy data from cloud storage](storage#Pre-signed-URLs-vs-Storage-proxies). |
| **Enable AI Features** | Enable [AI Assistant](ask_ai) for your labeling interface configuration. |
| **Enable Ask AI** | Enable the [AI Assistant](ask_ai) for general Label Studio help. |

### Email notification settings

Determines what email preferences are available from the [**Account and Settings** page](user_account). 

Note the following:

* New users will have their email preferences enabled by default. 
* If you disable a notification here, that preference is hidden from their **Account and Settings** page and is blocked for all users in your organization. 
* If you re-enable a notification, the preference will appear again in their **Account and Settings** page and will revert back to whatever state the user had it in before it was disabled for the organization. 

### Frequently asked Enterprise billing questions

Find answers to common questions related to billing. 

#### What happens if my plan is inactive?

If your subscription to Label Studio Enterprise expires or is cancelled, you can no longer perform labeling, review annotations, or add new users to your organization. You can log in and export your completed annotations. 

#### What happens if I have too many active users?

You need to purchase additional seats for your Label Studio Teams subscription if you have more active users than your subscription allows. A user counts as an active user when they are assigned a role. Invited users that have not yet accepted an invitation appear as "Not activated" and do not count toward the seat limit.

## Label Studio Starter Cloud

Label Studio Starter Cloud has the **Usage & Billing** page that shows information about your subscription and how many seats you have in use. 

!!! note
    Only the Organization owner can access the Usage & Billing page. 

There are two components to the subscription:

* **Base subscription** - This is your access to Label Studio Starter Cloud and includes 1 seat.
* **Additional seats** - You can purchase up to 11 additional seats (for a total of 12) on an as-needed basis.

### Manage seats

#### Add seats

As an Owner, go to **Organization > Usage & Billing**. Click **Manage Seats** and increase your seat count. 

When you add seats, the cost is prorated and is reflected on your next invoice. An organization can have up to 12 seats. 

#### Remove seats

Before you can remove seats, you must deactivate their associated users. You cannot have more active users than seats.

To deactivate a user, go to the **Organization > Members** page and set the user's role to **Deactivated**. 

Then click **Manage Seats** and decrease your seat count. 

When you remove seats, the cost is prorated and is reflected on your next invoice.

### Frequently asked Starter Cloud billing questions

#### How do I cancel?

As an Owner, go to **Organization > Usage & Billing** and click **Cancel**. 

After cancellation, your account remains active until the end of your paid billing period. During this time, you have full access to the Label Studio Starter Cloud features.

However, after cancellation, you cannot add user seats. If you need more users than your current seat count allows, you must reactivate your subscription.

When the billing period ends, you will retain access to Label Studio and can download your data. However, you will be unable to import new data, annotate existing data, or create new projects.

#### How do I renew?

If you do not cancel your subscription, it is automatically renewed at the end of the billing period.

#### Can I upgrade to Label Studio Enterprise?

Yes, you can upgrade to Label Studio Enterprise, please contact our sales: sales@humansignal.com.