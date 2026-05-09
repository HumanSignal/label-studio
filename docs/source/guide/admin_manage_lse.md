---
title: Manage user accounts
short: Manage user accounts
tier: enterprise
type: guide
order: 0
order_enterprise: 372
meta_title: Manage user accounts
meta_description: How to assign users to roles, delete users, tag users, and deactivate users
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

To programmatically activate and assign roles to users, you can use the API:

https://api.labelstud.io/api-reference/api-reference/organizations/members/update


You can find user ID and organization ID from the **Organization** page:

![Screenshot of the role drop-down menu](/images/admin/user-ids.png)

You can also use the API:

* [List organizations](https://api.labelstud.io/api-reference/api-reference/organizations/list)
* [List members](https://api.labelstud.io/api-reference/api-reference/organizations/members/list)

## Tag members

You can tag organization members with metadata. 

### Apply member tags via CSV

To bulk apply member tags, go to the Organization page and click **Tag Members**. 

From here you can upload a CSV with the following format:

```csv
email,tags
heidi@humansignal.com,"Data Science, Seattle"
sally@humansignal.com,"Finance, New York City"
```

* Ensure you include `email,tags` as the header. 
* Tags must be encapsulated in quotation marks. 
* If you have multiple tags, separate them with a comma. 



!!! info Tip
    If you are exporting the CSV from a spreadsheet editor, make sure you check the format in a text editor before uploading. Spreadsheet editors can add unnecessary formatting. 


### Add and delete tags

To delete or manually add new tags, go to **Organization > Settings > Member Tags**. 

### Manually assign tags

If you want to manually assign tags to individual users, you can use the **Tags** column in the org members table. 

![screenshot](/images/admin/tags-apply.png)

## Deactivate users

You can deactivate a user account by assigning them to the **Deactivated** role. Deactivating a user revokes their access and opens up their seat in your license. 

You can reactivate a user by assigning them to an active user role.


## Delete users

1. From the Organization page, select the user you want to delete. 

2. Click **Delete**. 

3. A confirmation message appears. Click **Delete Member**. 

Once deleted, any completed work or changes that the user made will appear as belonging to a "Deleted User."

If you want to add the user again at a later date, you will need to re-invite them to the organization. 


