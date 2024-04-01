---
title: User management overview
short: User management 
tier: enterprise
type: guide
order: 0
order_enterprise: 366
meta_title: User management overview
meta_description: User management options available in Label Studio Enterprise
section: "Manage Your Organization"
---

User management can be a crucial component in your data annotation workflow. 

Data labeling often deals with sensitive or proprietary information, and controlling who has access to this data is vital to protect it from unauthorized access or misuse. By implementing robust user management, you can ensure that only authorized user accounts can access specific datasets. This is particularly important in environments that handle sensitive data, such as medical records or personal information, where data privacy regulations like GDPR or HIPAA might apply.

Furthermore, user management streamlines the workflow and enhances the efficiency of data labeling projects. Because different users can have distinct roles, you can customize your projects to so that each user has the appropriate tools and data access needed to perform their tasks effectively. This not only improves the accuracy and consistency of the data labeling process, but also minimizes the risk of errors or conflicts caused by unauthorized access or modifications. 

Label Studio Enterprise user management options include:

* **Role-Based Access Control (RBAC)**: Roles dictate the level of access that a users has and what actions they are able to complete. For more information about these roles, see [Roles and Permissions](admin_roles). For information about assigning roles, see [Manage user accounts](admin_manage_lse).

* **User workflows through roles**: You can also use roles to design annotation workflows for your users. For example, you can use the project settings to configure separate instructions to display to reviewers and annotators. For more information, see [Project setup](setup_project).

* **User Activity Monitoring**: Administrators can track user activities, such as who labeled what data and when, through an activity log. For more information, see [Activity logs](admin_logs). 

* **Projects and Workspaces**: You can control project visibility by using workspace and project membership. Users with the Manager, Annotator, or Reviewer role must be added as a member in order to view a workspace or project. Workspaces are used to group projects, and membership cascades down to projects within the workspace. For more information, see [Project setup](setup_project).

* **SSO/SAML and SCIM Integration**: For enterprises using Single Sign-On (SSO) or System for Cross-domain Identity Management (SCIM), Label Studio Enterprise allows mapping groups to roles at both the organization and project levels. For more information, see [SSO and SAML setup](auth_setup) and [SCIM2 setup](scim_setup). 

<i> Table 1: Roles in Label Studio Enterprise</i>

| Role          | Description                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner         | Not an assignable role. Manages Label Studio. Can create and modify workspaces, create and modify projects, and view activity log.                                                           |
| Administrator | Has full access to all workspaces and projects. Can modify workspaces, view activity logs, and approve invitations. Can’t see the workspace owner’s account page.                            |
| Manager       | After being assigned to a workspace by an Owner or Administrator, has full administrative access in the assigned workspaces. Can view any project and has full access to their own projects. |
| Reviewer      | Reviews annotated tasks. Can view projects with tasks assigned to them. Can review and update task annotations.                                                                              |
| Annotator     | Labels tasks. Can view projects with tasks assigned to them and label tasks in those projects.                                                                                               |

## Roles and workspaces

Use a combination of roles, to control what actions users can take, and project workspaces, to control what data and projects users have access to.

For example, a project annotator using Label Studio sees only the projects they have access to:
<img src="/images/LSE-annotator-view.png" alt="Diagram showing that only Label Studio projects that they have been added to are visible to an annotator."/>
<i>Figure 1: Only Label Studio projects are added and visible to an annotator.</i>

A Label Studio administrator sees all projects and workspaces that exist in the Label Studio instance:
<img src="/images/LSE-admin-view.png" alt="Diagram showing that an administrator can view all projects and workspaces in a Label Studio instance."/>
<i>Figure 2: An administrator can view all projects and workspaces in a Label Studio instance.</i>

## Permissions in Label Studio Enterprise

<i>Table 3: Permissions in Label Studio Enterprise </i>

<table>
<thead>
  <tr>
    <th>Action</th>
    <th>Annotator</th>
    <th>Reviewer</th>
    <th>Manager</th>
    <th>Administrator</th>
    <th>Owner</th>
  </tr>
  </thead>
  <tr>
    <td colspan="6"><b>User Management</b></td>
  </tr>
  <tr>
    <td>Change user roles</td>
    <td></td>
    <td></td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>View People page</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Invite people to organization</td>
    <td></td>
    <td></td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Workspace access</td>
    <td style="text-align:center">R</td>
    <td style="text-align:center">R</td>
    <td style="text-align:center">CRUD</td>
    <td style="text-align:center">CRUD</td>
    <td style="text-align:center">CRUD</td>
  </tr>
 <tr>
<td colspan="6"><b>Project Management</b></td>
</tr>
  <tr>
    <td>Project access</td>
    <td style="text-align:center">R</td>
    <td style="text-align:center">R</td>
    <td style="text-align:center">CRUD</td>
    <td style="text-align:center">CRUD</td>
    <td style="text-align:center">CRUD</td>
  </tr>
  <tr>
    <td>Save custom project templates</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="6"><b>Data Access</b></td>
  </tr>
  <tr>
    <td>View project data</td>
    <td>If permitted in project settings, can view own.</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Import data</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Export data</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="6"><b>Data Labeling Workflows</b></td>
  </tr>
  <tr>
    <td>Assign annotators to tasks</td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Access labeling workflow</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Access review workflow</td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Monitor annotator agreement</td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Review annotator performance</td>
    <td>Own</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Verify annotation results</td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Assign reviewers to tasks</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="6"><b>Advanced</b></td>
  </tr>
  <tr>
    <td>API access to equivalent Label Studio functionality</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️ for own or workspace projects</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="6"><b>Analytics</b></td>
  </tr>
  <tr>
    <td>Track what happens and when on annotation dashboards</td>
    <td>Own</td>
    <td>Project</td>
    <td style="text-align:center">Workspace and invited projects</td>
    <td style="text-align:center">Organization️</td>
    <td style="text-align:center">Organization️</td>
  </tr>
  <tr>
    <td>View annotator dashboard</td>
    <td style="text-align:center">✔️</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>View system-wide activity log</td>
    <td></td>
    <td></td>
    <td></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
</table>

## Set up role-based access control (RBAC) with Label Studio

Set up role-based access control in Label Studio by using [organizations and workspaces to organize projects](#Use-organizations-to-manage-data-and-projects) and assigning roles to organization members. Use roles to control what actions organization members can perform in Label Studio, and manage organization and workspace membership to manage what data and projects those people can access.

Only people with the Administrator and Owner roles can invite people to Label Studio and manage their role membership.

!!! note
    If you are using SSO/SAML or SCIM, you can map groups to roles on the organization level and the project level. For more information, see [Set up authentication for Label Studio](auth_setup). 

### Invite users to Label Studio Enterprise

Invite users to your organization by doing the following:

1. In the Label Studio UI, click the hamburger icon to expand the left-hand menu and click **Organization**.
2. On the Organization page, click **+ Add People**.
3. In the dialog box that appears, click **Copy Link** and share the invitation link to your Label Studio instance with the people that you want to join your organization.

### Restrict signup without invite links

To restrict who has access to your Label Studio instance, invite collaborators directly using an invitation link. To disable the signup page unless someone uses the invitation link, you should add this environment variable to your setup:

```bash
LABEL_STUDIO_DISABLE_SIGNUP_WITHOUT_LINK=true
```

### Assign roles to invited users

After a user that you invite clicks the link and signs up for an account, their account exists but must be activated by an organization owner or administrator. When you activate someone's account, you also assign them a role in Label Studio.

To activate a user account and assign a role, do the following:

1. In the Label Studio UI, click the hamburger icon to expand the left-hand menu and click **Organization**.
2. Locate the user with a status of **Not Activated**.
3. Select the drop-down under **Role** and select the relevant role for the user.
   Your changes save automatically. Repeat these steps for any additional users.

### Statuses of user accounts

!!! note
    `NOT_ACTIVATED` status is equal to `Pending` status.

If a user is in `Pending` status then it means he was invited and signed up for the account, but his role is not defined by administrator.

If you assign `Deactivate` to a role then it means you free one seat in license and a user with deactivated doesn't have access to your organization.

### Programmatically assign roles

To programmatically activate and assign roles to users, you can use the following API endpoints.

#### Assign a role to a user

For a given user ID and a given organization ID, you can programmatically assign a role to a user by sending a POST request to the `/api/organizations/{id}/memberships` endpoint. See the [Organizations API documentation inside Label Studio Enterprise](api#operation/api_organizations_memberships_create).

#### Determine the organization ID or user ID

If you're not sure what the organization ID is, you can do the following:

- If you only have one organization in your Label Studio instance, use `0`.
- If you have multiple organizations, make a GET request to the [`/api/organizations/`](/api#operation/api_organizations_read) endpoint.

To retrieve user IDs for the members of an organization, make a GET request to [`/api/organizations/{id}/memberships`](/api#operation/api_organizations_memberships_list).


## Delete users

1. From the Organization page, select the user you want to delete. 

2. Click **Delete**. 

    ![Screenshot of the Delete action](/images/user_delete.png)

3. A confirmation message appears. Click **Delete Member**. 

Once deleted, any completed work or changes that the user made will appear as belonging to a "Deleted User."

If you want to add the user again at a later date, you will need to re-invite them to the organization. 
