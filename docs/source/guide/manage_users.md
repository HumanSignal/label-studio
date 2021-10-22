---
title: Manage access to Label Studio
short: Manage access
badge: <i class='ent'></i>
type: guide
order: 251
meta_title: Manage Role-Based Access Control in Label Studio
meta_description: Manage access and set up permissions with user roles, organizations, and project workspaces for your data labeling, machine learning, and data science projects in Label Studio Enterprise.
---

Manage access to projects, organizations, and workspaces in Label Studio to restrict who can view data, annotations, and predictions in your data labeling projects. 

<div class="enterprise"><p>
Role-based access control, organizations, and workspaces are available only in Label Studio Enterprise Edition. For information about users in the open source Label Studio Community Edition, see <a href="signup.html">Set up user accounts for Label Studio</a>.
</p></div>

## Roles in Label Studio Enterprise

There are five roles available in Label Studio Enterprise Edition. Organization members have different levels of access to projects and workspaces. Every member can label tasks.

| Role | Description |
| --- | --- |
| Owner | Not an assignable role. Manages Label Studio. Can create and modify workspaces, create and modify projects, and view activity log. |
| Administrator | Has full access to all workspaces and projects. Can modify workspaces, view activity logs, and approve invitations. Can’t see the workspace owner’s account page. | 
| Manager | After being assigned to a workspace by an Owner or Administrator, has full administrative access in the assigned workspaces. Can view any project and has full access to their own projects. |
| Reviewer | Reviews annotated tasks. Can view projects with tasks assigned to them. Can review and update task annotations. |
| Annotator | Labels tasks. Can view projects with tasks assigned to them and label tasks in those projects. |

## Roles in Label Studio Teams

There are two roles available in Label Studio Teams Edition. Organization members have different levels of access to projects and workspaces. Every member can label tasks.

| Role | Description |
| --- | --- |
| Owner | Not an assignable role. Manages Label Studio. Can create and modify workspaces, create and modify projects, and view activity log. |
| Manager | After being assigned to a workspace by an Owner, has full administrative access in the assigned workspaces. Can view any project and has full access to their own projects. |

## Roles and workspaces
Use a combination of roles, to control what actions users can take, and project workspaces, to control what data and projects users have access to. 

For example, a project annotator using Label Studio sees only the projects they have access to:
<img src="/images/LSE/LSE-annotator-view.jpg" width=400 height=275 alt="Diagram showing that only Label Studio projects that they have been added to are visible to an annotator."/>

A Label Studio administrator sees all projects and workspaces that exist in the Label Studio instance:
<img src="/images/LSE/LSE-admin-view.jpg" width=600 height=400 alt="Diagram showing that an administrator can view all projects and workspaces in a Label Studio instance."/>

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

Set up role-based access control in Label Studio by using [organizations and workspaces to organize projects](#Use-organizations-to-manage-data-and-projects) and assigning roles to organization members. Use roles to control what actions organization members can perform in Label Studio, and manage organization and workspace membership to manage what data and projects those people can access.

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
For a given user ID and a given organization ID, you can programmatically assign a role to a user by sending a POST request to the `/api/organizations/{id}/memberships` endpoint. See the [Organizations API documentation inside Label Studio Enterprise](api#operation/api_organizations_memberships_create).

#### Determine the organization ID or user ID
If you're not sure what the organization ID is, you can do the following:
- If you only have one organization in your Label Studio instance, use `0`.
- If you have multiple organizations, make a GET request to the [`/api/organizations/`](/api#operation/api_organizations_read) endpoint.

To retrieve user IDs for the members of an organization, make a GET request to [`/api/organizations/{id}/memberships`](/api#operation/api_organizations_memberships_list).

## Use organizations to manage data and projects

To manage organization membership, use the **Organization** page in the Label Studio UI. When you sign up for Label Studio Enterprise for the first time, an organization associated with your account is automatically created. You become the owner of that organization. People who join Label Studio Enterprise from an invitation link or with an LDAP or SSO role join an existing organization.

If permitted by your Label Studio Enterprise plan, you can create organizations in Label Studio to further separate access to data and projects. For example, you could create separate organizations to separate work and access between completely unrelated departments. If some departments might collaborate with each other on a project, you can use one organization for both and instead use workspaces to organize the projects that they might or might not be collaborating on. 

For example, you might set up one of the following possible configurations:
- One organization for your company, with one workspace for the support department and another for the development team, with specific projects in each workspace for different types of customer requests. 
  <img src="/images/LSE/LSE-one-org-many-workspaces.jpg" alt="Diagram showing Label Studio with one organization with multiple workspaces and projects within each workspace."/>
- Multiple organizations, such as one for the customer claims department and another for the customer support department, with specific workspaces in each organization for specific types of insurance, such as home insurance claims and auto insurance claims, and specific projects in each workspace for types of claims, such as Accident Claims, Injury Claims, Natural Disaster Claims. The Customer support organization might have workspaces specific to the types of support queues, with projects for specific types of calls received.
<img src="/images/LSE/LSE-multiple-orgs-workspaces.jpg" alt="Diagram showing Label Studio with three organizations, each one with multiple workspaces and projects within each workspace."/>

When you assign a user role to an organization member, they hold that role for all workspaces and projects for that organization.
  
Managers within an organization can see all workspaces in that organization, even if they don't have access to perform actions in them. Annotators and reviewers can only see projects, not workspaces.

If you have access to multiple organizations, use the **Organizations** page to switch between the organizations that you are a member of.

## Create workspaces to organize projects
Within an organization, owners, administrators, and managers can create and manage workspaces. Workspace managers can only manage workspaces that they create or have been added to. 

Create a workspace to organize projects by doing the following:
1. In the Label Studio UI, click the `+` sign next to **Workspaces** in the menu.
2. Name the workspace, and if you want, select a color.
3. Click **Save**

After creating a workspace, you can create projects for that workspace, or use the **Project Settings** page to move a project to the new workspace. Your private sandbox also functions as a workspace, but only you can see projects in your sandbox. 

### Add or remove members to a workspace

From a specific workspace inside the Label Studio UI, do the following:
1. Click **Manage Members**.
2. Use the search functionality to locate the user that you want to add to the workspace.
3. Select the checkbox next to their name and click the `>` arrow so that they appear in the list of users that **Belong to the Workspace**.
4. Click **Save**.

You can also remove yourself or other members from a workspace by following the same process and removing members with the `<` arrow. 

### Sandbox workspace
Each user has a personal Sandbox workspace that they can use to experiment with project settings and get familiar with Label Studio. After you set up a project and want others to collaborate on it with you, you can update the project workspace in the **Project Settings**. You cannot add members to your Sandbox workspace.

### Delete a workspace
You can only delete a workspace if it has no projects. If you want to delete a workspace, first delete the projects or move them to another workspace. 

To delete a workspace, do the following:
1. In the Label Studio UI, open the workspace.
2. Click the gear icon next to the workspace name.
3. In the dialog box that appears, click **Delete Workspace**. If the button is not available to select, the workspace still contains projects. 