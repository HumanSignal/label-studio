---
title: Manage access to Label Studio
type: guide
order: 251
meta_title: Role-Based Access Control in Label Studio
meta_description: Label Studio Documentation for managing access and setting up permissions for your data labeling, machine learning, and data science projects.
---

Manage access to projects, organizations, and workspaces in Label Studio to restrict who can view data, annotations, and predictions in your data labeling projects. 

Role-based access control, organizations, and workspaces are available only in Label Studio Enterprise Edition. For information about users in the open source Label Studio Community Edition, see [Set up user accounts for Label Studio](signup.html). 

## Roles in Label Studio Enterprise

There are five roles available in Label Studio Enterprise Edition. Organization members have different levels of access to projects and workspaces. Every member can label tasks.

| Role | Description |
| --- | --- |
| Owner | Manages Label Studio. Can create organizations, modify workspaces, create and modify projects, and view activity log. |
| Administrator | Manages an organization. Has full access to all projects. Can modify workspaces, view activity logs, and approve invitations. Can’t see the workspace owner’s account page. | 
| Manager | Manages projects. Can view any project and has full access to their own projects. |
| Reviewer | Reviews annotated tasks. Can view projects with tasks assigned to them. Can review and update task annotations. |
| Annotator | Labels tasks. Can view projects with tasks assigned to them and label tasks in those projects. |

## Permissions in Label Studio Enterprise 

<table>
  <tr>
    <th>Action</th>
    <th>Annotator</th>
    <th>Reviewer</th>
    <th>Manager</th>
    <th>Administrator</th>
    <th>Owner</th>
  </tr>
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
    <td></td>
    <td></td>
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

Set up role-based access control in Label Studio by using [organizations and workspaces to organize projects](organize_projects.html) and assigning roles to organization members. Use roles to control what actions organization members can perform in Label Studio, and manage organization and workspace membership to manage what data and projects those people can access.

Only people with the Administrator and Owner roles can invite people to Label Studio and manage their role membership. 

### Invite users to Label Studio Enterprise

Invite users to your organization by doing the following:
1. In the Label Studio UI, click the hamburger icon to expand the left-hand menu and click **Organization**. 
2. On the Organization page, click **+ Add People**.
3. In the dialog box that appears, click **Copy Link** and share the invitation link to your Label Studio instance with the people that you want to join your organization.

### Assign roles to invited users
After a user that you invite clicks the link and signs up for an account, their account exists but must be activated by an organization owner or administrator. When you activate someone's account, you also assign them a role in Label Studio. 

To activate a user account and assign a role, do the following:
1. In the Label Studio UI, click the hamburger icon to expand the left-hand menu and click **Organization**. 
2. Locate the user with a status of **Not Activated**. 
3. Select the drop-down under **Role** and select the relevant role for the user.
Your changes save automatically. Repeat these steps for any additional users. 

### Programmatically assign roles
To programmatically activate and assign roles to users, you can use the following API endpoints. 

#### Assign a role to a user 
For a given user ID and a given organization ID, POST a request to the `/api/organizations/{id}/memberships` endpoint with the following body:

```json
{
  user_id: Int,
  role: NO|DI|OW|AD|MA|AN|RE
} 
```

Enumerate a role with one of the following abbreviations:
| Role | Full Role Name |
| --- | --- |
| NO | Not Activated |
| DI | Deactivated |
| OW | Owner |
| AD | Administrator |
| MA | Manager |
| AN | Annotator |
| RE | Reviewer |


For example, to set a user with an ID of 9 as an annotator, POST the following request body:
```json
{
  "user_id": 9,
  "role": "AN"
}
```

#### Determine the organization ID or user ID
If you're not sure what the organization ID is, you can do the following:
- If you only have one organization in your Label Studio instance, use `0`.
- If you have multiple organizations, make a GET request to the `/api/organizations/` endpoint.

To retrieve user IDs for the members of an organization, make a GET request to `/api/organizations/{id}/memberships`.