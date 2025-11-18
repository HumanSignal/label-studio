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

* Access for Annotators, Reviewers, and Managers is restricted based on which projects and workspaces they have access to. For more information, see [Project setup](setup_project). 
* Owners can further restrict permissions within their organization using the [Permissions page](admin_permissions). 

## Roles in Label Studio Enterprise

For information on how to assign users to roles, see [Manage user accounts](admin_manage_lse).

| Role          | Description                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**         | Manages the organization and has full permissions at all levels.<br><br>This is not an assignable role, and there is only one Owner per organization. By default, the Owner is tied to the account that created the Label Studio organization. To change the Owner, you will need to [open a support ticket](https://support.humansignal.com/hc/en-us/requests/new).                                                           |
| **Administrator** | Has full permissions at most levels.<br><br>Can access and update all workspaces and projects, invite members to the organization, and set most ([but not all](admin_usage)) organization settings.                            |
| **Manager**       | Has full administrative access over projects and workspaces that they created or to which they have been added as a member. <br><br>Managers cannot access the Organization page. |
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
    <td colspan="6" style="text-align:center"><b>Organization Management</b></td>
  </tr>
  <tr>
    <td>View the Organization page</td>
    <td></td>
    <td></td>
    <td style="text-align:center"></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
    <tr>
    <td>Assign member roles</td>
    <td></td>
    <td></td>
    <td></td>
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
    <td>Set up model providers for the org</td>
    <td></td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
    </tr>
    <tr>
    <td>Configure organization settings</td>
    <td></td>
    <td></td>
    <td></td>
    <td style="text-align:center">Partial</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td colspan="6" style="text-align:center"><b>Project Management</b></td>
  </tr>
  <tr>
    <td>Workspace access</td>
    <td style="text-align:center">R</td>
    <td style="text-align:center">R</td>
    <td style="text-align:center">CRUD[^1]</td>
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
    <td>View the Data Manager</td>
    <td>Depends on project settings</td>
    <td>Depends on project settings</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Configure project settings</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>View and configure project plugins</td>
    <td></td>
    <td></td>
    <td style="text-align:center">✅[^2]</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
  <tr>
    <td>Pause annotators and reviewers</td>
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
    <td style="text-align:center"></td>
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
    <td>Perform bulk labeling</td>
    <td style="text-align:center">✅[^3]</td>
    <td style="text-align:center">✅</td>
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
    <td>View project dashboard and members dashboard</td>
    <td></td>
    <td></td>
    <td style="text-align:center">Workspace and invited projects</td>
    <td style="text-align:center">Organization</td>
    <td style="text-align:center">Organization</td>
  </tr>
  <tr>
    <td>View annotator dashboard</td>
    <td style="text-align:center">✅[^4]</td>
    <td style="text-align:center">✅[^4]</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
    <td style="text-align:center">✅</td>
  </tr>
    <tr>
    <td colspan="6" style="text-align:center"><b>Prompts</b></td>
  </tr>
  <tr>
      <td>Use Prompts (create/evaluate/run/apply to projects)</td>
      <td></td>
      <td></td>
      <td>✅</td>
      <td>✅</td>
      <td>✅</td>
    </tr>
    <tr>
      <td>See predictions generated by Prompts in projects</td>
      <td>✅</td>
      <td>✅</td>
      <td>✅</td>
      <td>✅</td>
      <td>✅</td>
    </tr>
</table>


[^1]: For workspaces or projects they created or were invited to
[^2]: Owners can restrict this in the org settings
[^3]: The project must be using manual distribution and the annotator must be granted Data Manager access
[^4]: For their own work/history
