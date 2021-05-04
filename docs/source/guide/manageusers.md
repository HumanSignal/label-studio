---
title: Manage access to Label Studio
type: guide
order: 251
meta_title: RBAC and Organizations
meta_description: Label Studio Documentation for managing access, creating workspaces and organizations, and setting up permissions for your data labeling, machine learning, and data science projects.
---

Manage access to projects, organizations, and workspaces in Label Studio to restrict who can view data, annotations, and predictions in your data labeling projects. 

Role-based access control, organizations, and workspaces are available only in Label Studio Enterprise Edition. CONTACT US TO LEARN MORE AND STUFF. For information about users in the open source Label Studio Community Edition, see [Set up user accounts for Label Studio](signup.html). 

## Roles in Label Studio Enterprise

what are the roles, how to control/configure, 

how to restrict who can sign up and what role people get, etc.


There are five roles available in Label Studio Enterprise Edition. Organization members have different levels of access to projects and workspaces. Every member can label tasks.

| Role | Description |
| --- | --- |
| Owner | Manages Label Studio. Can create organizations, modify workspaces, create and modify projects, and view activity log. |
| Administrator | Manages an organization. Has full access to all projects. Can modify workspaces, view activity logs, and approve invitations. Can’t see the workspace owner’s account page. | 
| Manager | Manages projects. Can view any project and has full access to their own projects. |
| Reviewer | Reviews annotated tasks. Can view projects with tasks assigned to them. Can review and update task annotations. |
| Annotator | Labels tasks. Can view projects with tasks assigned to them and label tasks in those projects. |

An annotator is a user who can only annotate a stream of items
Reviewer has a review stream
Manager is in most cases a data scientist. Can create new projects and workspaces, and edit projects settings
Administrator is a manager who can assign roles as well as have access to an activity log
Owner is the highest role, can do everything. Owner account needs to be changeable directly through the django administrator panel

Who can do what in Label Studio?

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

## Create organizations to manage data and projects

You can create organizations in Label Studio to correspond to different departments in your company, for example to delineate between completely unrelated departments. If some departments might collaborate with each other on a project, set up an organization for both and use workspaces to organize the projects that they might or might not be collaborating on. 

For example, you can set up one of the following possible configurations:
- One organization for your company, with one workspace for the support department and another for the development team, with specific projects in each workspace for different types of customer requests. 
- Multiple organizations, such as one for the customer claims department and another for the customer support department, with specific workspaces in each organization for specific types of insurance, such as home insurance claims and auto insurance claims, and specific projects in each workspace for types of claims, such as Accident Claims, Injury Claims, Natural Disaster Claims. The Customer support organization might have workspaces specific to the types of support queues, with projects for specific types of calls received.  

Users within an organization can see all workspaces, even if they don't have access to them. Use organizations to prevent some users from knowing about the existence of other workspaces and projects.




## Create workspaces to organize projects

