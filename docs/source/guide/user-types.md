---
title: User types
short: User types
tier: enterprise
type: guide
order: 0
order_enterprise: 372
meta_title: User types
meta_description: Overview of the different user types available in Label Studio Enterprise
section: "Manage Your Organization"
parent: "manage_users"
parent_enterprise: "manage_users"
---

Label Studio Enterprise supports the following user types:

| User type | Description |
|---|---|
| **Standard** | A regular user account that can log in to Label Studio and access the Label Studio UI.|
| **Service** | Service accounts are granted a role, but cannot log in to access the Label Studio UI. They are used solely for programmatic access via the API. |


## Standard user accounts

A standard user account is an organization member that can access log in to Label Studio and access the Label Studio UI.

The number of standard user accounts is typically limited by your Label Studio seat count. You can check your seat count on the [**Usage & License**](admin_usage) page.

To add standard user accounts, you can do one of the following:

* [Invite users individually](admin_user#Invite-members)
* [Add users via SSO/SAML, LDAP, or SCIM](admin_auth)

## Service accounts

Service accounts only have API access to Label Studio. They cannot log in and navigate the Label Studio UI.

!!! note
    Each organization is allowed 1 service account by default. This initial service account does not count against your seat count.

    If you need to add more service accounts, you can request additional seats from your HumanSignal account representative.

To add a service account, go to the **Organization > Members** page and click the drop-down option next to **Invite Members**. Select **Create Service Account**.

SCREENSHOT

Complete the following fields:

| Field | Description |
|---|---|
| **Name** | The name of the service account. |
| **Organization role** | The role determines the level of access the service account has within the organization. For more information, see [User roles and permissions](admin_roles). |
| **Workspaces and projects** | For a service account with a role of Annotator, Reviewer, or Manager, assign the service account to one or more workspaces and projects. |