---
title: Manage user accounts
short: Manage user accounts
tier: enterprise
type: guide
order: 0
order_enterprise: 372
meta_title: Manage user accounts
meta_description: How to assign users to roles, delete users, deactivate users
section: "Manage Your Organization"
parent: "manage_users"
parent_enterprise: "manage_users"
date: 2024-02-06 12:00:25
---


!!! note
    If you are using SSO/SAML or SCIM, you can map groups to roles on the organization level and the project level. For more information, see [Set up SSO authentication for Label Studio](auth_setup) and [Set up SCIM2 for Label Studio](scim_setup). 

    If you are using an IdP with SCIM or SAML/SSO, you should also handle user deactivations and deletions from the IdP. 


## Assign roles to users

If you invite users using the [invite link option](admin_user#Invite-users-to-Label-Studio-Enterprise), their account is created but must be activated by assigning them to a role. 

!!! info Tip
    You can use the role filter above the table to see all Pending users. Select the **Not Activated** role.

1. Open Label Studio and click the menu in the upper left. 
2. Select **Organization**. 

    If you do not see the **Organization** option, you do not have access to the Organization page. Only users in the Owner or Administrator role can access this page. 

3. Locate the user account to which you are assigning a role. 

4. Use the drop-down menu next to the user to select a role. 

![Screenshot of the role drop-down menu](/images/admin/assign_role.png)


## Programmatically assign roles

To programmatically activate and assign roles to users, you can use the API. 

For a given user ID and a given organization ID, you can programmatically assign a role to a user by sending a POST request to the `/api/organizations/{id}/memberships` endpoint. See the [Organizations API documentation](/api/#tag/Organizations/operation/api_organizations_memberships_partial_update).

#### Determine the organization ID or user ID

If you're not sure what the organization ID is, you can do the following:

- If you only have one organization in your Label Studio instance, use `0`.
- If you have multiple organizations, make a GET request to the [`/api/organizations/`](/api#operation/api_organizations_read) endpoint.

To retrieve user IDs for the members of an organization, make a GET request to [`/api/organizations/{id}/memberships`](/api#operation/api_organizations_memberships_list).

## Deactivate users

You can deactivate a user account by assigning them to the **Deactivated** role. Deactivating a user revokes their access and opens up their seat in your license. 

You can reactivate a user by assigning them to an active user role.


## Delete users

1. From the Organization page, select the user you want to delete. 

2. Click **Delete**. 

3. A confirmation message appears. Click **Delete Member**. 

Once deleted, any completed work or changes that the user made will appear as belonging to a "Deleted User."

If you want to add the user again at a later date, you will need to re-invite them to the organization. 


