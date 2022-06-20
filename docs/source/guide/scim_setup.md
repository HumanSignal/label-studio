---
title: Set up SCIM2 for Label Studio
short: Set up SCIM2
badge: <i class='ent'></i>
type: guide
order: 253
meta_title: System for Cross-domain Identity Management (SCIM) for Label Studio Enterprise
meta_description: Label Studio Enterprise documentation for setting up SCIM2
---

Cross-domain Identity Management (SCIM) is a popular protocol to manage access for services and applications across an organisation. This guide helps to set up SCIM integration to manage access to Label Studio Enterprise in your organisation. 

Using SCIM provider you can manage access to Label Studio Enterprise workspaces, grant roles to individual users and groups.

## Requirements

SCIM interacts with your SSO integration. If you are using Okta or similar SSO providers they usually have SCIM integration based on SSO.

Follow [Set up SSO](auth_setup.md) if you don't have SSO set up yet.

Label Studio Enterprise uses version 2 of SCIM standard. As an example, this guide uses integration with [Okta](). However, Label Studio Enterprise follows [SCIM RFC 5741](https://datatracker.ietf.org/doc/html/rfc7644#section-3.2) and can be integrated with any access management services that supports the standard.

## Set up SCIM integration

To be able to manage access to Label Studio Enterprise you need to add the application to your SCIM provider (Okta). Okta uses OAuth token to interact with REST API endpoints of the application to provision and deprovision access.

### Add Label Studio Enterprise (if not complete)

1. Navigate to **Applications → Applications** in Okta. Click  **Create App Integration**. 
2. Select **SAML 2.0**. Fill App name (e.g. _Label Studio Enterprise_).
3. On the next step **Configure SAML** set up SAML integration following [Set up SSO guide](auth_setup.md).
4. Make sure Label Studio Enterprise appears in the list of active applications.

### Enable SCIM provisioning

1. Navigate to **Applications → Applications** in Okta. Select **Label Studio Enterprise**.
2. Go to **General** tab and check **Enable SCIM provisioning**.
3. Switch to **Provisioning** tab. Select **Integration** in the left menu. Click **Edit** in the right corner.

Fill the fields:
 - **SCIM connector base URL** - https://{LABEL_STUDIO_BASE_URL}/scim/v2/ where {LABEL_STUDIO_BASE_URL} is the base URL of your Label Studio Enterprise instance.
 - **Unique identifier field for users** - leave userName, Label Studio Enterprise uses email as user identifier in this field.
 - **Supported provisioning actions** - select the following items:
   - Import New Users and Profile Updates
   - Push New Users
   - Push Profile Updates
   - Push Groups
 - **HTTP Header → Authorization** - put the OAuth token from the settings page.

### SCIM settings and application triggers

1. On the application page navigate to **Provisioning** tab and select **To App** in the left menu. Click **Edit** in the right corner.
2. Enable the following items:
   - Create Users
   - Update User Attributes
   - Deactivate Users
   - Sync Password

## Assign the application to a single user

You can assign the application on a user page as well as on the application page.

1. On the application page navigate to **Assignments** tab.
2. Click **Assign** and select **Assign to People**.
3. Select the people you would like to be added to Label Studio Enterprise.
4. Click **Done**.

After you click Done Okta will send the requests to create users accordingly in the Label Studio Enterprise.

## Unassigning the application for users

1. On the application page navigate to **Assignments** tab.
2. Select **People** in the left menu.
3. Click the delete cross against the user you would like to unassign.
4. Confirm the unassignment.

## Assign the application to a group

The most convenient way to manage access to the application is via groups. You can assign Label Studio to groups and manage the groups in Okta. The changes will be propagated to the application.

### Set up group mapping

1. In Label Studio open SCIM settings (**Organization → SCIM**) 
2. Update roles and workplaces mapping. If a workplace does not exist it will be created with the name of Okta group.

### Assign a group to the application

3. In Okta on the application page open **Assignments** tab. 
4. Select **Assign → Assign** to Groups and choose the group. 
5. Set attribute **Active to true**. 

After saving the group assignment the update will be queued to be sent to Label Studio. 

Alternatively, you can push the changes immediately to Label Studio.

### Sync groups to the application

1. In Okta on the application page open **Push Groups** tab. 
2. Click **Push Groups** and select Find groups by name. 
3. Find the group you would like to sync to Label Studio. 
4. Choose either Create Group or Link Group (in case you already have a workplace with the same name as specified in the SCIM settings page).

## Unassigning the application for groups

To unassign a group from the application follow the similar steps as for individual users.

1. On the application page navigate to **Assignments** tab.
2. Select **Group** in the left menu.
3. Click the delete cross against the group you would like to unassign.
4. Confirm the unassignment.
