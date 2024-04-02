---
title: Manage projects in Label Studio Enterprise
short: Manage projects
tier: all
type: guide
order: 116
order_enterprise: 116
meta_title: Manage projects in Label Studio Enterprise
meta_description: A description of various project management actions available.
section: "Create & Manage Projects"
---

For more project actions, see:

* [Create a project](setup_project#Create-a-project)
* [Add members to a project](setup_project#Add-members-to-a-project)
* [Publish a project](setup_project#Publish-a-project)
* [Assign annotators to project tasks](manage_data#Assign-annotators-to-tasks)

You can use the **All Projects** page to view projects across all workspaces. 


## Use the organization page
=======
![Screenshot of the All Projects page](/images/project/projects_page.png)

=======
![Screenshot of the All Projects page](/images/project/projects_page.png)



## Search projects

Use the search box in the upper right. You can search by project name. 

* To search within a workspace, use the search field on the workspace page. 
* To search across all projects, including those within archived workspaces, go to **All Projects** to perform your search. 

The project search allows partial and case-insensitive matches.  


## Create a project template

A project template includes the following:



## Workspaces
=======
* Labeling configuration
* Most project settings

It does not include:

* Project tasks or imported data
* Project membership settings 
* Task assignments
* External storage settings

To create a project template:

1. In the project that you want to use as a template, open the **Settings**.
2. In the **General** tab for the project settings, click **Save as Template**.
3. Add a title and description for the project.
4. Click **Save**.

## Duplicate projects

When you duplicate a project, you can copy the following:

* Labeling configuration
* Most project settings
* Project tasks or uploaded data (optionally)

Duplication does not include:

## More menu to Pin or Unpin and Duplicate projects

Use the more menu (three dots (**...**) located in the bottom-right of each project card) to explore the following features:

### Pin or Unpin projects

You can pin a project to the top of the page and unpin a project too. The **Pin project** and **Unpin project** feature allows you to filter and find projects of interest.

**Roles and Capabilities**

This section describes the user roles and capable actions on the **Pin project** and **Unpin project** feature by using the Label studio UI.

As an **Organization Admin** and **Reviewer** in Label Studio UI, you can do the following:

- View all your pinned projects.
- View all the pinned projects by other administrators.
- Aware that a project is pinned because of the label in the project card.
- Unpin a pinned project from the menu on the card.
- Pin an unpinned project from the menu on the card.
- See a temporary notification about the action that you have performed.
- While the notification is visible, you have the ability to undo the action.
- Pin an unpinned project.
- Aware that you pinned a project because it will display at the beginning of the list.
- Aware that a project is pinned because the label will be visible on the card.
- View all projects by selecting the option in the filter.
- The display order shows the pinned projects first, then all other projects.
- Paginate through pinned and unpinned projects.
- If filter is applied to view pinned projects, they will display first in order.
- When you paginate and there are not enough pinned projects to display, you will see all other projects.
- View projects by workspace, including projects that you and other administrators have pinned.

!!! note
    If there are no available pinned projects, all other projects will display.

As an **Annotator** in Label Studio UI, you can do the following:

- View projects that have been pinned by people with permissions.
- Cannot manage pinning or unpinning projects.
- Filter projects.
- See when there are no pinned projects
- Support copy is not available because permissions are not granted to perform those actions.

To pin or unpin projects:

1. In the Label Studio UI, click **All Projects** to see all the projects in one place.
2. Click on the more menu (three dots **...** located in the bottom-right of each project card) to see the following options.

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/three-dots.png" style="opacity: 0.8"/></div>
  <i>Figure 8: Click the three dots (...).</i>

3. Click **Pin project** to pin your projects.

!!! note
    When you pin a project, a message (for example, `New Project was pinned`) is displayed at the bottom of the page to confirm that your project is pinned. - Click **Undo** near the message to undo this action.

4. To filter and display only the pinned projects, click **Pinned projects** on the top-right side drop-down list.

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/filter-pinned-projects-only.png" style="opacity: 0.8"/></div>
  <i>Figure 11: Filter only pinned projects.</i>

Now, you can see all the pinned projects only.

5. To filter and display only the unpinned projects, click **Unpinned projects** on the top-right side drop-down list. Now, you can see all the unpinned projects only.

6. To view all the projects (both the **Pinned** and **Unpinned** projects), click **All projects** on the top-right side drop-down list.

## Search projects

Use the search box to search for projects by name. This allows partial and case-insensitive matches. The search is performed as you type, and the results are displayed in the project list. For example, if you type `new` in the search box, you will see projects with names such as `New Project`, `New Project 2`, and `New Project 3`.

1. Search for a project by name in a workspace.

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/search-projects-in-workspace.png" style="opacity: 0.8"/></div>
  <i>Figure 12: Search projects within a workspace.</i>

2. To search for a project by name in all workspaces, click **All Projects** from the left navigation pane.

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/search-projects-in-all-workspaces.png" style="opacity: 0.8"/></div>
  <i>Figure 13: Search projects in all workspaces.</i>
   
3. To clear the search results, click the `x` icon in the Search box.

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/search-clear-results.png" style="opacity: 0.8"/></div>
  <i>Figure 14: Clear search results.</i>

4. Searching for pinned, or unpinned projects just requires selection of `Pinned projects` or `Unpinned projects` from the adjacent dropdown selection.

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/search-pinned-projects.png" style="opacity: 0.8"/></div>
  <i>Figure 15: Search pinned projects.</i>

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/search-unpinned-projects.png" style="opacity: 0.8"/></div>
  <i>Figure 16: Search unpinned projects.</i>
   
5. In the event of no results found for the search and filter criteria you will be presented with a message indicating that no results were found and allowed to create a new project or update the search criteria.

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/search-criteria-no-results.png" style="opacity: 0.8"/></div>
  <i>Figure 17: No matching results for search criteria.</i>
    

## Duplicate a project

The **Duplicate project** feature allows you to duplicate projects to a target workspace optionally importing the settings, tasks, and annotations. Duplicate a project by using the Project’s settings or Project card’s more menu (three dots **...**).
* Project membership settings 
* Task assignments
* Completed annotations
* External storage settings

To duplicate a project:

1. Click the overflow menu for the project and select **Duplicate project**:

    ![Screenshot of project menu](/images/project/project_menu_lse.png)
2. Select the workspace in which you want the new project to be located. 
3. Enter a new name and (optionally) a description for the project.
4. Select whether you only want to duplicate project settings (including the labeling configuration), or if you also want to include tasks. 
5. Click **Duplicate**. 

You may need to refresh the page before you can see the new project. 

## Move projects between workspaces

1. Open the project and click **Settings** in the upper right.
2. Under the **General** tab, use the **Workspace** drop-down menu to select a new workspace.
3. Click **Save**.


## Pin projects

## Working with Archived Workspaces
To pin a project, click the overflow menu for the project and select **Pin project**:

![Screenshot of project menu](/images/project/project_menu_lse.png)

### Archiving a workspace
Pinned projects are pinned to the top of the Projects page. 


## Delete projects 

To delete a project, open the project settings and select the **Danger Zone** page. From here you can access the **Delete Project** action. 

  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/workspace-edit-modal.png" style="opacity: 0.8"/></div>

### View archived workspace

To view archived workspaces, expand the archived workspaces toggle at the bottom of the project page sidebar.

  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/workspace-archive-expand.png" style="opacity: 0.8"/></div>

### Unarchiving a workspace

To unarchive a workspace, use the same menu where you initially archived it and click “Unarchive” which will bring the workspace into the normal workspace view.

  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/workspace-unarchive-menu.png" style="opacity: 0.8"/></div>

## Delete a workspace

You can only delete a workspace if it has no projects. If you want to delete a workspace, first delete the projects or move them to another workspace.

To delete a workspace, do the following:

1. In the Label Studio UI, open the workspace.
2. Click the gear icon next to the workspace name.
3. In the dialog box that appears, click **Delete Workspace**. If the button is not available to select, the workspace still contains projects.

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/delete-workspace.png" style="opacity: 0.8"/></div>
  <i>Figure 10: Delete a workspace.</i>
Deleting a project permanently removes all tasks, annotations, and project data from Label Studio.
