---
title: Workspaces
short: Workspaces
tier: enterprise
type: guide
order: 0
order_enterprise: 101
meta_title: Workspaces
meta_description: An overview of workspaces and actions you can perform with workspaces. 
section: "Create & Manage Projects"
date: 2024-02-05 17:36:34
---

Workspaces can help you organize, categorize and manage projects at different stages of their lifecycle or use case:

* Use workspaces to group and categorize related projects. 
* Use workspaces to simplify project membership administrations. When a user is added as a member to a workspace, they will have access to all projects within that workspace. Their permissions for the project depend on their [user role](admin_roles).
* Use workspaces to archive projects. 


## Create a workspace

!!! note
    To create a new workspace, your user role must be Owner, Administrator, or Manager. 


1. In Label Studio, click the plus icon next to **Workspaces** in the menu on the right:

    ![Screenshot of add button](/images/click-plus-sign.png)

2. Provide a name for the workspace and, optionally, a color. 
3. Click **Save**. 

You can now begin [creating projects](setup_project) within the workspace. 

!!! info Tip
    You can also create projects by duplicating an existing project from a different workspace. Or, you can update a [project's settings](manage_projects#Move-projects-between-workspaces) to move it from one workspace to another.  

## Sandbox workspace

Each user has a personal Sandbox workspace that they can use to experiment with project settings and get familiar with Label Studio. Only you can see projects within your sandbox. 

You can use the sandbox to configure a project and test your settings. Then when you're ready, you can move the project out of your sandbox and into a workspace where other users can access it. 

## Add or remove workspace members

When a user is added to a workspace, they are automatically granted membership to any projects within the workspace. The actions and information they are able to see within a project depends on their user role. 

1. From the workspace, click **Manage Members** in the upper right.
2. Use the search functionality to locate the user that you want to add to the workspace.
3. Select the checkbox next to their name and click the `>` arrow to add them. Click the opposite arrow `<` to remove members
4. Click **Save**.

Users are not sent notifications when they are added to a workspace. The workspace appears when they log in to Label Studio or refresh their page.

## Workspace permissions

User roles are set at the organization level. For more information, see [User roles and permissions](admin_roles).

* **Owners and Administrators**--These users can see all workspaces, even if they haven't been added as members. 

    They can also see unpublished projects within these workspaces. The only exception is your Sandbox workspace, which only you can see. 
* **Managers**--Managers can create workspaces. But other Managers within the organization cannot view the workspace unless they are added as a member. 

    Once added, managers can see all projects within a workspace, including unpublished projects. 
* **Annotators**--Cannot view a workspace until added as member. 

    Once added, they can see cards for all projects, but they cannot enter the label stream until the project is published and they have tasks to annotate. 
* **Reviewers**--Cannot view a workspace until added as member.

    Once added, they can see cards for all projects, but cannot access the project until it is published and they have tasks to review. 

## Edit workspaces

You can archive, delete, rename, and choose a different color for a workspace. Click the gear icon next to the workspace name to see your options:

![Screenshot of workspace menu](/images/project/workspace-edit-modal.png)

To access these actions, your user role must be Owner, Administrator, or Manager. 

## Archive workspaces

To reduce clutter in the workspace sidebar you can archive workspaces from view, allowing you to easily locate high-priority labeling initiatives. You’ll still have complete access to workspaces that have been archived and you can unarchive them at any time.

Click the gear icon next to the workspace name, or click the overflow menu next to the workspace and select **Archive**:

![Screenshot of workspace menu](/images/project/workspace-dropdown-menu.png)

### View archived workspace and unarchive workspaces

To view archived workspaces, expand the archived workspaces menu at the bottom of the project page sidebar.

![Screenshot of archived workspace options](/images/project/workspace-archive-expand.png)

From here, you can click the gear icon next to the workspace name, or click the overflow menu next to the workspace and select **Unarchive**:

![Screenshot of archived workspace options](/images/project/workspace-unarchive-menu.png)


## Delete a workspace

You can only delete a workspace if it has no projects. If you want to delete a workspace, first [delete the projects](manage_projects#Delete-projects) or [move them](manage_projects#Move-projects-between-workspaces) to another workspace.

Once all projects are deleted, click the gear icon next to the workspace name and click **Delete**. 




