---
title: How SCIM works with Label Studio Enterprise
short: SCIM workflows and API
tier: enterprise
type: guide
order: 0
order_enterprise: 390
meta_title: How SCIM works with Label Studio Enterprise
meta_description: A description of SCIM workflows and entities
section: "Manage Your Organization"
parent: "scim_setup"
parent_enterprise: "scim_setup"
date: 2024-01-25 10:07:22
---

System for Cross-domain Identity Management (SCIM) is an open standard for automating the exchange of user identity information between identity domains or IT systems. SCIM is designed to make user management in cloud-based applications and services easier and more efficient, reducing the time and resources required for user administration.

For organizations using Label Studio Enterprise, SCIM provides a streamlined approach to managing user identities and access permissions. By integrating SCIM, administrators can automate the provisioning and deprovisioning of users, synchronize user data across systems, and ensure that the right individuals have access to the necessary resources within Label Studio Enterprise.

## SCIM workflow

You can use SCIM to do the following:

* Add users
* Remove users (set their user role to Deactivated)
* Assign users to groups
* Unassign a user from a group
* Map groups to user roles
    
    Note that groups are defined in the IdP, not Label Studio. However, the group to role mapping is defined in Label Studio. 

## SCIM API endpoint

You can use SCIM with Label Studio to control and interact with two entities: Users and Groups. 

!!! note
    Our API uses the [django-scim2 library](https://django-scim2.readthedocs.io/en/latest/). 

#### Users
* Search for users: `GET /scim/v2/Users?filter=userName =<user@email.com>&startIndex=1&count=100`
    * `200` response if user exists
    * `404` if not 
* Get user: `GET /scim/v2/Users/user@email.com`
* Create user: `POST /scim/v2/Users/` 

    This will also require a payload that includes user information such as email and password. 

#### Groups

* Modify group members: `PUT /scim/v2/Groups/<group-name>`

    Example:
    ```json
{
  "BODY": {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
    "id": "<group-name>",
    "displayName": "<group-name>",
    "members": [
      {
        "value": "<user@email.com>",
        "display": "<user@email.com>"
      }
    ]
  }
} 
    ```

* Create group: `POST /scim/v2/Groups/<group-name>`
* Get group: `GET /scim/v2/Groups/<group-name>`

#### SCIM settings API

These settings can also be configured in the Label Studio app from the **Organization > SCIM** page. From here you can map groups to user roles and map groups to workspaces ([see below](#SCIM-settings)).

* [Retrieve SCIM settings](https://app.heartex.com/docs/api/#tag/SSO/operation/api_scim_settings_list): `GET /api/scim/settings`
* [Update SCIM settings](https://app.heartex.com/docs/api/#tag/SSO/operation/api_scim_settings_list): `POST /api/scim/settings`


## SCIM settings

### Roles

You can assign roles to users through group mapping. Use the [Update SCIM settings API](https://app.heartex.com/docs/api/#tag/SSO/operation/api_scim_settings_list) or log in to Label Studio and go to the **Organization** page. Click **SCIM** in the upper right. 

#### Organization-level roles

These roles can be **Annotator**, **Reviewer**, **Manager**, or **Administrator**. 

Each group can only be mapped to one role at the organization level. For more information about what permissions each role has, see [Roles in Label Studio Enterprise](manage_users#Roles-in-Label-Studio-Enterprise). 

You can also assign a group to the **Deactivated** role, which would revoke their Label Studio access. 


#### Project-level roles

For more granular control, you can assign project-level roles to a group. 

These roles can be **Annotator**, **Reviewer**, or **Inherit** (meaning they inherit their organization-level role). 

Unlike organization-level roles, a group can be assigned to multiple roles across multiple projects. For example, Group A can be Annotators in Project 1 and Reviewers in Project 2. 


### Workspaces

You can also use SCIM to assign user groups to a workspace, or create a new workspace if one does not already exist. 

When you assign a group to a workspace, they are added as workspace members. This means that by default, they will have access to any projects within that workspace. 

Their permissions for those projects will depend on their organization-level role. However, you can override this by using SCIM to assign a project-level role (see above). 
