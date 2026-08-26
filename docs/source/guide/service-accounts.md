---
title: Service accounts
short: Service accounts
tier: enterprise
type: guide
hide_menu: false
order: 0
order_enterprise: 363
meta_title: Service accounts
meta_description: Overview of service accounts in Label Studio Enterprise
section: "Manage Your Organization"
parent_enterprise: "admin_settings"
date: 2025-02-18 12:03:59
---

Service accounts are allowed API access to Label Studio, but they cannot login or interact with the platform via the UI. They are used solely for programmatic access via the [Label Studio API](https://api.labelstud.io/api-reference/introduction/getting-started).


!!! note
    Each organization is allowed 1 service account by default. This initial service account is not counted against your license seat count.

    If you need to add more, you can request additional service accounts.

## Create a service account

To add a service account, go to **Organization > Settings > Service Accounts**.

Click **Create Service Account** and complete the following fields:

| Field | Description |
|---|---|
| **Name** | The name of the service account. This cannot be changed once the service account is created. |
| **Organization role** | The role determines the level of programmatic access the service account has within the organization. For more information, see [User roles and permissions](admin_roles). <br><br>**Note:** You can later upgrade or downgrade the service account's role as needed. |
| **Workspaces and projects** | For a service account with a role of Annotator, Reviewer, or Manager, assign it to one or more workspaces and/or projects. <br><br>**Note:** You can later change the workspaces/projects by assigning or removing the service account the same way you would with a standard user. Service accounts will appear in the user list when managing project and workspace members. |

When you create the service account, you are provided an API token to use with it. You will have one chance to copy the token, so be sure to copy it to a secure location. 

Once created, the service account will have full API access and capabilities within their role and project's scope.

## Update and manage service accounts

Click the overflow menu next to the service account to view the following actions:

| Action | Description |
|---|---|
| **View Member Performance** | See the [member performance dashboard](dashboard_annotator) for the service account. |
| **View Activity Log** | See the [activity logs](admin_logs) for the service account. |
| **Reset Token** | Revoke and reset the service account's API token. |
| **Delete** | Delete the service account. |

