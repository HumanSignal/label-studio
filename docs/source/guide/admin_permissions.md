---
title: Customize organization permissions
short: Permissions
tier: enterprise
type: guide
hide_menu: false
order: 0
order_enterprise: 362
meta_title: Customize organization permissions
section: "Manage Your Organization"
parent_enterprise: "admin_settings"
date: 2025-02-18 12:03:59
---

!!! note
    This page is only visible to users in the Owner role. 

You can use this page to customize certain permissions for roles. For information about Label Studio Enterprise roles and default permissions, see [User roles and permissions](admin_roles).

Note the following:

* Permissions for the Owner role are not configurable. 
* You can use the options on this page to restrict permissions, but you cannot extend permissions. 

    For example, if an action is typically available to Managers, Admins, and Owners, you can restrict it to Admins and Owners, but you cannot *extend* it to Annotators or Reviewers. 

* Restrictions will also apply to the API. For example, if you restrict Managers' ability to configure cloud storage, they will not be able to complete those actions through the UI or the API. 


Permissions that can be restricted include the following:

| Permission | Default Roles |
|------------|-------------|
| **Invite members to organization** | Manager+ |
| **Create API Tokens** | All roles |
| **Edit Plugins** | Manager+ |
| **Manage Cloud Storage** | Manager+ |
| **Manage Webhooks** | Manager+ |
| **Access Project Dashboard** | Manager+ |
| **Access Member Performance Dashboard** | All roles |
| **Use AI Assistant** | Manager+ |
| **Delete Tasks** | Manager+ |
| **Reset Project Cache** | Manager+ |
| **Drop All Tabs** | Manager+ |
| **Delete Project** | Manager+ |

!!! note
    Permissions for Annotators, Reviewers, and Managers are already restricted to projects that they created (if a Manager) or have explicitly been granted access to. 


