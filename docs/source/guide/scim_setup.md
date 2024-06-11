---
title: Set up SCIM2 for Label Studio
short: SCIM2
tier: enterprise
type: guide
order: 0
order_enterprise: 387
meta_title: System for Cross-domain Identity Management (SCIM) for Label Studio Enterprise
meta_description: Label Studio Enterprise documentation for setting up SCIM2
section: "Manage Your Organization"

---

System for Cross-domain Identity Management (SCIM) is a popular protocol to manage access for services and applications across an organization. This guide helps to set up SCIM integration to manage access to Label Studio Enterprise in your organization. 

Using SCIM provider, you can manage access to Label Studio Enterprise workspaces, grant roles to individual users and groups.

## Requirements

SCIM interacts with your SSO integration. 

!!! note
    Okta or similar SSO providers have SCIM integration based on SSO.


!!! attention "important"
    If you do not have SSO set up yet, then follow [Set up SSO](auth_setup.html).


!!! attention "important"
    Only owner's access token can be used for SCIM Identity Provider.


Label Studio Enterprise uses SCIM Version 2.0 standard. As an example, this page uses integration with [Okta](https://www.okta.com/integrate/). However, Label Studio Enterprise follows [SCIM RFC 5741](https://datatracker.ietf.org/doc/html/rfc7644#section-3.2) and can be integrated with any access management services that support the standard.

For more information on how SCIM workflows, see [How SCIM works with Label Studio Enterprise](scim_workflow). 

## Set up SCIM integration

<i>Check this video tutorial about SCIM and Okta setup.</i>

!!! attention "important"
    This video demonstrates the use of `userName` in the 'Unique Identifier Field for Users' field. It is essential to use `email` as the unique identifier instead of `userName`; otherwise, SCIM will not function correctly with users who were created prior to the SCIM integration.

<iframe width="560" height="315" src="https://www.youtube.com/embed/MA3de3gu18A" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

To manage access to Label Studio Enterprise, add the application to your SCIM provider (Okta). Okta uses Bearer (request header should be `Authorization: Bearer <token>`) token to interact with REST API endpoints of the application to provision and deprovision access.

### Add Label Studio Enterprise (if not complete)

1. Navigate to **Applications → Applications** in Okta. Click  **Create App Integration**. 
2. Select **SAML 2.0**. Fill App name (for example, _Label Studio Enterprise_).
3. On the next step **Configure SAML** set up SAML integration following the instructions to [Set up SSO guide](auth_setup.html).
4. Make sure Label Studio Enterprise appears in the list of active applications.

### Enable SCIM provisioning

1. Navigate to **Applications → Applications** in Okta. 
2. Select **Label Studio Enterprise**.
3. Go to **General** tab and check **Enable SCIM provisioning**.
4. Switch to **Provisioning** tab. 
5. Select **Integration** in the left menu. 
6. Click **Edit** in the right corner.

Fill in the fields:
 - **SCIM connector base URL**: `https://<LABEL_STUDIO_BASE_URL>/scim/v2/` where `<LABEL_STUDIO_BASE_URL>` is the base URL of your Label Studio Enterprise instance.
 - **Unique identifier field for users**: Use `email`. Label Studio Enterprise uses email as user identifier in this field.
 - **Supported provisioning actions**: Select the following items:
   - Import New Users and Profile Updates
   - Push New Users
   - Push Profile Updates
   - Push Groups
 - **HTTP Header → `Authorization: Bearer <token>`**: Put the Bearer token from the LSE owner's account profile. In case of Label Studio `Token` and `Bearer` are the same tokens. However, it's important to use `Bearer` instead of `Token` in the request header. 

### SCIM settings and application triggers

1. On the application page navigate to **Provisioning** tab and select **To App** in the left menu. Click **Edit** in the right corner.
2. Enable the following items:
   - Create Users
   - Update User Attributes
   - Deactivate Users

## Assign the application to a single user

You can assign the application on both the **user** page and **application** page.

1. On the **application** page navigate to **Assignments** tab.
2. Click **Assign** and select **Assign to People**.
3. Select the people you would like to be added to Label Studio Enterprise.
4. Click **Done**.

After you click **Done**, Okta will send the requests to create users accordingly in the Label Studio Enterprise.

## Unassigning the application for users

1. On the application page navigate to **Assignments** tab.
2. Select **People** in the left menu.
3. Click the delete cross against the user you would like to unassign.
4. Confirm the unassignment.

## Assign the application to a group

The most convenient way to manage access to the application is via groups. You can assign Label Studio to groups and manage the groups in Okta. The changes will be propagated to the application.

### Set up group mapping

1. In Label Studio, click the menu in the upper left and select **Organization**. 

    ![Screenshot of Organization in the Label Studio menu](/images/general/menu_organization.png)
    
    If you do not see the option to select **Organization**, you are not logged in with the appropriate role. 
2. Select **SCIM** in the upper right. 
3. Update roles and workspaces mapping. Ensure the group name you enter is the same as the group name being sent by your SCIM provider. 

    * **Organization Roles to Groups Mapping**---Map groups to roles at the organization level. The role set at the organization level is the default role of the user and is automatically assigned to workspaces and projects. For more information on roles, see [Roles in Label Studio Enterprise](manage_users#Roles-in-Label-Studio-Enterprise). 

        You can map multiple groups to the same role. Note that users who are **Not Activated** or **Deactivated** do not count towards the seat limit for your account. 
    * **Workspaces to Groups Mapping**---Add groups as members to workspaces. Users with Manager, Reviewer, or Annotator roles can only see workspaces after they've been added as a member to that workspace.
    
        Select an existing workspace or create a new one. You can map multiple groups to the same workspace.  
    * **Projects to Groups Mapping**---Map groups to roles at the project level. Project-level roles can be **Annotator**, **Reviewer**, or **Inherit**. 
    
        You can map a group to different roles across multiple projects. You can also map multiple groups to the same roles and the same projects. For more information on roles, see [Roles in Label Studio Enterprise](manage_users#Roles-in-Label-Studio-Enterprise). 
    
        If you select **Inherit**, the group will inherit the role set above under **Organization Roles to Groups Mapping.** If the group is inheriting the Not Activated role, the users are mapped to the project, but they are not actually assigned to the project until the group is synced (meaning that the user authenticates first). 



### Assign a group to the application

1. Using Okta, navigate to the **application** page and open the **Assignments** tab. 
2. Select **Assign → Assign** to Groups and choose the group. 
3. Set attribute **Active to true**. 

After saving the group assignment, the update will be queued and sent to Label Studio. 

!!! note
    Alternatively, you can push the changes immediately to Label Studio.

### Sync groups to the application

1. Using Okta, navigate to the **application** page and open the **Push Groups** tab. 
2. Click **Push Groups** and select **Find groups by name**. 
3. Find the group you would like to sync to Label Studio. 
4. 4. Choose either **Create Group** or **Link Group**, if you already have a workplace with the same name as specified on the **SCIM** >> **Settings** page.

## Unassigning the application for groups

To unassign a group from the application, follow the steps for [Unassigning the application for users](#Unassigning-the-application-for-users).

1. On the **application** page, navigate to the **Assignments** tab.
2. Select **Group** in the left menu.
3. Click the delete cross against the group you would like to unassign.
4. Confirm the unassignment.


<i>Check this video tutorial to remove a user and group.</i>
<iframe width="560" height="315" src="https://www.youtube.com/embed/vMA0TLhHGYE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
