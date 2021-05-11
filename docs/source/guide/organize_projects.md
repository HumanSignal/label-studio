---
title: Organize projects in Label Studio
type: guide
order: 252
meta_title: Organizations and Workspaces
meta_description: Label Studio Documentation for creating workspaces and organizations for your data labeling, machine learning, and data science projects.
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

Label Studio Enterprise uses organizations and workspaces to let you manage access to data and projects within one Label Studio environment. If you use Label Studio Community Edition, all projects and data are visible to everyone with access to Label Studio. See [Features of Label Studio](label_studio_compare.html) to learn more.

## Use organizations to manage data and projects

When you sign up for Label Studio Enterprise, an organization associated with your account is automatically created. You become the owner of that organization. To manage organization membership, use the **Organization** page in the Label Studio UI. 

If permitted by your Label Studio Enterprise plan, you can create organizations in Label Studio to further separate access to data and projects. For example, you could create separate organizations to separate work and access between completely unrelated departments. If some departments might collaborate with each other on a project, you can use one organization for both and instead use workspaces to organize the projects that they might or might not be collaborating on. 

For example, you might set up one of the following possible configurations:
- One organization for your company, with one workspace for the support department and another for the development team, with specific projects in each workspace for different types of customer requests. 
  <img src="/images/LSE/LSE-one-org-many-workspaces.jpg" alt="Diagram showing Label Studio with one organization with multiple workspaces and projects within each workspace."/>
- Multiple organizations, such as one for the customer claims department and another for the customer support department, with specific workspaces in each organization for specific types of insurance, such as home insurance claims and auto insurance claims, and specific projects in each workspace for types of claims, such as Accident Claims, Injury Claims, Natural Disaster Claims. The Customer support organization might have workspaces specific to the types of support queues, with projects for specific types of calls received.
<img src="/images/LSE/LSE-multiple-orgs-workspaces.jpg" alt="Diagram showing Label Studio with three organizations, each one with multiple workspaces and projects within each workspace."/>
  
Users within an organization can see all workspaces in that organization, even if they don't have access to perform actions in them. Use organizations to prevent some users from knowing about the existence of other workspaces and projects. 

When you [assign a user role](manage_users.html) to an organization member, they hold that role for all workspaces and projects for that organization.

If you have access to multiple organizations, use the **Organizations** page to switch between the organizations that you are a member of.

## Create workspaces to organize projects
Within an organization, owners, administrators, and managers can create and manage workspaces. Workspace managers can only manage workspaces that they create or have been added to. 

Create a workspace to organize projects:
1. In the Label Studio UI, click the `+` sign next to **Workspaces** in the menu.
2. Name the workspace, and if you want, select a color.
3. Click **Save**

After creating a workspace, you can create projects for that workspace, or use the **Project Settings** page to move a project to the new workspace.

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