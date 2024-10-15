---
title: User roles and permissions
short: Roles and permissions
tier: enterprise
type: guide
order: 0
order_enterprise: 375
meta_title: User roles and permissions
meta_description: A description of the user roles and permissions available in Label Studio Enterprise. 
section: "Manage Your Organization"
parent: "manage_users"
parent_enterprise: "manage_users"
date: 2024-02-05 17:19:21
---

Your user role determines your level of access to actions and information in Label Studio. 

Access can be further refined through workspace and project membership. For more information, see [Project setup](setup_project). 

## Roles in Label Studio Enterprise

For information on how to assign users to roles, see [Manage user accounts](admin_manage_lse).

| Role          | Description                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**         | Manages the organization and has full permissions at all levels.<br><br>This is not an assignable role, and there is only one Owner per organization. By default, the Owner is tied to the account that created the Label Studio organization. To change the Owner, you will need to [open a support ticket](https://support.humansignal.com/hc/en-us/requests/new).                                                           |
| **Administrator** | Has full permissions at most levels.<br><br>Can modify workspaces, view activity logs, and approve invitations. However, Administrators cannot access the [billing](billing) page.                            |
| **Manager**       | Has full administrative access over assigned workspaces and projects.<br><br>Managers cannot access the Organization page. They must be assigned to a workspace by an Owner or Administrator. But once assigned, they have full administrative access in the assigned workspaces. |
| **Reviewer**      | Reviews annotated tasks.<br><br>Can only view projects that include tasks assigned to them. Can review and update task annotations.                                                                              |
| **Annotator**     | Labels tasks.<br><br>Can only view projects with tasks assigned to them and label tasks in those projects.                                                                                               |


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
    <td colspan="6" style="text-align:center"><b>User Management</b></td>
  </tr>
  <tr>
    <td>Assign user roles</td>
    <td></td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>View the Organization page</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Invite users</td>
    <td></td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>View system-wide activity log</td>
    <td></td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td colspan="6" style="text-align:center"><b>Project Management</b></td>
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
    <td>Project access</td>
    <td style="text-align:center">R</td>
    <td style="text-align:center">R</td>
    <td style="text-align:center">CRUD[^1]</td>
    <td style="text-align:center">CRUD</td>
    <td style="text-align:center">CRUD</td>
  </tr>
  <tr>
    <td>Save custom project templates</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td colspan="6" style="text-align:center"><b>Data Access</b></td>
  </tr>
  <tr>
    <td>View project data</td>
    <td>If permitted in project settings, can view own.</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Import data</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Export data</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td colspan="6" style="text-align:center"><b>Data Labeling Workflows</b></td>
  </tr>
  <tr>
    <td>Assign annotators to tasks</td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Access labeling workflow</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Access review workflow</td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Monitor annotator agreement</td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Review annotator performance</td>
    <td>Own</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Verify annotation results</td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Assign reviewers to tasks</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td colspan="6" style="text-align:center"><b>Advanced</b></td>
  </tr>
  <tr>
    <td>API access to equivalent Label Studio functionality</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅[^1]</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td colspan="6" style="text-align:center"><b>Analytics</b></td>
  </tr>
  <tr>
    <td>Track what happens and when on annotation dashboards</td>
    <td>Own</td>
    <td>Project</td>
    <td style="text-align:center">Workspace and invited projects</td>
    <td style="text-align:center">Organization</td>
    <td style="text-align:center">Organization</td>
  </tr>
  <tr>
    <td>View annotator dashboard</td>
    <td style="text-align:center">✅</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>


[^1]: For their own workspaces and invited projects

