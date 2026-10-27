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

* Permissions for the Owner role are not configurable. Owners can always perform every action listed below.
* You can use the options on this page to have more fine-grained control over which roles can perform certain actions. 
* Any restrictions you configure also apply to the API. For example, if you restrict Managers' ability to configure cloud storage, they cannot complete those actions through the UI or the API. 
* Some permissions can only be granted to certain roles. A role that can't be granted a permission has no checkbox for it.

!!! note
    Permissions for Annotators, Reviewers, and Managers are already restricted to projects that they created (if a Manager) or have explicitly been granted access to. 

## Member Management

| Permission | Can be granted to | Default | Description |
|------------|-------------------|---------|-------------|
| **Invite members to organization** | Administrators, Managers | Administrator+ | Controls who can invite organization members at the project level (Managers) and the organization and project level (Administrators).<br><br>If enabled for Managers, they get the **Invite Members** action on the **Members** page of a project. Invited members are added to the organization and automatically added to the project. Managers can only invite users to projects that they created or have been invited to. This permission does not give Managers access to the **Organization** page.<br><br>**On-prem:** If you haven't configured an email server, this setting controls who can generate an invite link. |
| **Assign same-level roles** | Administrators, Managers | Manager+ | Controls whether a role can invite or create members with the same role as their own. When unchecked, they can only assign roles below their own level. |

## Integrations & APIs

| Permission | Can be granted to | Default | Description |
|------------|-------------------|---------|-------------|
| **Create API Tokens** | All roles | All roles | Controls who can create access tokens to use the API. All API endpoints are also constrained based on user role.<br><br>Changing this setting doesn't invalidate existing API tokens. To invalidate existing legacy tokens, disable them from the **Access Tokens** page at the organization level. To invalidate existing personal access tokens, expire all existing tokens from the organization level. |
| **Edit Plugins** | Administrators, Managers | Manager+ | Controls who can view, modify, and add [plugins](plugins) to a project. Plugins involve custom code that can significantly change the labeling interface and what information annotators can see and access. |
| **Manage Cloud Storage** | Administrators, Managers | Manager+ | Controls who can access the **Cloud Storage** page for a project. Users with access to this page can create and modify [cloud storage](storage) connections to import data into a project. |
| **Manage Webhooks** | Administrators, Managers | Manager+ | Controls who can create, modify, and delete [webhooks](webhooks) for a project. Webhooks support integration with third-party applications. |

## Interfaces

| Permission | Can be granted to | Default | Description |
|------------|-------------------|---------|-------------|
| **Author Interfaces** | Administrators, Managers | Manager+ | Controls who can write or edit [Interface](interfaces) code attached to a project. Interface code runs inside a sandboxed iframe, but it can still see the task data it is asked to render, so review it as you would any other code.<br><br>Requires **Manage Interfaces**. Annotators and Reviewers cannot be granted this permission. |
| **Manage Interfaces** | Administrators, Managers | Manager+ | Controls who can access the **Interfaces** section to list, create, edit, delete, and duplicate Interfaces. Turning it off for a role also turns off **Author Interfaces** for that role. |

## Analytics

| Permission | Can be granted to | Default | Description |
|------------|-------------------|---------|-------------|
| **Access Project Dashboard** | Administrators, Managers | Manager+ | Controls who can view the [project dashboards](dashboards). These pages provide performance and agreement information about users within the context of a specific project. |
| **Access Member Performance Dashboard** | All roles | All roles | Controls who can view the [Member Performance Dashboard](dashboard_annotator). This page provides metrics about a user's annotation and review activities over a period of time.<br><br>Annotators and Reviewers can only view their own dashboard. Managers can view this dashboard for all organization members, but can only filter for projects that they already have access to. |
| **Access Project Members Dashboard** | Administrators, Managers | Manager+ | Controls who can view the [Members Dashboard](dashboard_members). This page provides annotation agreement information about users within the context of a specific project, including the agreement matrix. |

## AI Tools

| Permission | Can be granted to | Default | Description |
|------------|-------------------|---------|-------------|
| **Use AI Assistant** | All roles | Manager+ | Controls which roles can access the in-app [AI Assistant](ask_ai) for help. Disable it if you prefer that all support requests go to your internal support organization.<br><br>This only applies to the AI Assistant available in the upper right of every Label Studio page. To also control the AI Assistant shown during project creation, disable AI features from the **Usage & License** page. |

## Destructive Actions

| Permission | Can be granted to | Default | Description |
|------------|-------------------|---------|-------------|
| **Delete Tasks** | Administrators, Managers | Manager+ | Controls who can delete tasks within a project. |
| **Reset Project Cache** | Administrators, Managers | Manager+ | Controls who can perform the **Reset Cache** action for a project. This is a troubleshooting action that resets the project labeling cache to fix labeling configuration validation errors. |
| **Drop All Tabs** | Administrators, Managers | Manager+ | Controls who can perform the **Drop All Tabs** action for a project. This is a troubleshooting action that deletes all Data Manager tabs except the **Default** tab. It can help when the Data Manager is not loading properly. |
| **Delete Project** | Administrators, Managers | Manager+ | Controls who can perform the **Delete Project** action. Users with this permission can permanently delete projects and all associated data, including tasks and annotations. |
| **Delete Own Projects in Personal Sandbox** | Managers | Off | Lets Managers who cannot **Delete Project** delete projects they created while those projects are in their own [Personal Sandbox](workspaces#Sandbox-workspace).<br><br>Projects created by someone else, and projects that were ever moved out of the sandbox, stay protected, even if they are moved back.<br><br>Only shown while **Delete Project** is off for Managers. |

## Dependent permissions

Two permissions depend on another permission for the same role:

* **Author Interfaces** requires **Manage Interfaces**. If you turn off **Manage Interfaces** for a role, **Author Interfaces** is turned off and disabled for that role.
* **Delete Own Projects in Personal Sandbox** is only available while **Delete Project** is off for Managers. **Delete Project** already lets Managers delete any project they can access, so while **Delete Project** is on for Managers, **Delete Own Projects in Personal Sandbox** is hidden and any earlier selection is cleared. If you turn **Delete Project** off again, the option reappears unchecked and you need to select it again.

!!! info tip
    You can click **Reset to Defaults** to return all permissions to their default value.
