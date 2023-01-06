---
title: Manage projects in Label Studio Enterprise
short: Project management
tier: enterprise
type: guide
order: 115
order_enterprise: 103
meta_title: Manage Role-Based Access Control in Label Studio
meta_description: Manage access and set up permissions with user roles, organizations, and project workspaces for your projects in Label Studio Enterprise.
section: "Configuration"

---

Organize projects into workspaces to make order in labeling data with Label Studio Enterprise. 

You can manage data and projects in the Label Studio UI using the following:

- [Use the organization page](#Use-the-organization-page).
- [Create workspaces to organize projects](#Create-workspaces-to-organize-projects).
  - [Add or remove members to a workspace](#Add-or-remove-members-to-a-workspace).
  - [Sandbox workspace](#Sandbox-workspace).
  - [More menu to Pin/Unpin and Duplicate projects](#More-menu-to-pin-or-unpin-and-duplicate-projects).
  - [Delete a workspace](#Delete-a-workspace).
  

### Use the organization page

To manage organization membership, use the **Organization** page in the Label Studio UI. When you sign up for Label Studio Enterprise for the first time, an organization associated with your account is automatically created. You become the owner of that organization. People who join Label Studio Enterprise from an invitation link or with an LDAP or SSO role join an existing organization.

If permitted by your Label Studio Enterprise plan, you can create organizations in Label Studio to further separate access to data and projects. For example, you could create separate organizations to separate work and access between completely unrelated departments. If some departments might collaborate with each other on a project, you can use one organization for both and instead use workspaces to organize the projects that they might or might not be collaborating on. 

For example, you might set up one of the following possible configurations:
- One organization for your company, with one workspace for the support department and another for the development team, with specific projects in each workspace for different types of customer requests. 
  <img style="width:70%" src="/images/LSE/LSE-one-org-many-workspaces.jpg" alt="Diagram showing Label Studio with one organization with multiple workspaces and projects within each workspace."/>
  <br/>
  <i>Figure 3: Label Studio with one organization with multiple workspaces and projects within each workspace.</i>

- Multiple organizations, such as one for the customer claims department and another for the customer support department, with specific workspaces in each organization for specific types of insurance, such as home insurance claims and auto insurance claims, and specific projects in each workspace for types of claims, such as Accident Claims, Injury Claims, Natural Disaster Claims. The Customer support organization might have workspaces specific to the types of support queues, with projects for specific types of calls received.
<img style="width:70%" src="/images/LSE/LSE-multiple-orgs-workspaces.jpg" alt="Diagram showing Label Studio with three organizations, each one with multiple workspaces and projects within each workspace."/>
<br>
<i>Figure 4: Label Studio with three organizations, each one with multiple workspaces and projects within each workspace.</i>

When you assign a user role to an organization member, they hold that role for all workspaces and projects for that organization.
  
Managers within an organization can see all workspaces in that organization, even if they don't have access to perform actions in them. Annotators and reviewers can only see projects, not workspaces.

If you have access to multiple organizations, use the **Organizations** page to switch between the organizations that you are a member of.

### Create workspaces to organize projects

Within an organization, owners, administrators, and managers can create and manage workspaces. Workspace managers can only manage workspaces that they create or have been added to. 

Create a workspace to organize projects by doing the following:

1. In the Label Studio UI, click the `+` sign next to **Workspaces** in the menu.
  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/click-plus-sign.png" style="opacity: 0.8"/></div>
  <i>Figure 5: Click the <b>+</b> sign.</i>

2. Name the workspace, and if you want, select a color.
3. Click **Save**.
  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/name-the-workspace.png" style="opacity: 0.8"/></div>
  <i>Figure 6: Name the workspace.</i>

After creating a workspace, you can create projects for that workspace, or use the **Project Settings** page to move a project to the new workspace. Your private sandbox also functions as a workspace, but only you can see projects in your sandbox. 

### Add or remove members to a workspace

From a specific workspace inside the Label Studio UI, do the following:
1. Click **Manage Members**.
2. Use the search functionality to locate the user that you want to add to the workspace.
3. Select the checkbox next to their name and click the `>` arrow so that they appear in the list of users that **Belong to the Workspace**.
4. Click **Save**.
   
  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/manage-members.png" style="opacity: 0.8"/></div>
  <i>Figure 7: Manage members.</i>

You can also remove yourself or other members from a workspace by following the same process and removing members with the `<` arrow. 

### Sandbox workspace

Each user has a personal Sandbox workspace that they can use to experiment with project settings and get familiar with Label Studio. After you set up a project and want others to collaborate on it with you, you can update the project workspace in the **Project Settings**. You cannot add members to your Sandbox workspace.

### More menu to Pin or Unpin and Duplicate projects

Use the more menu (three dots (**...**) located in the bottom-right of each project card) to explore the following features: 

#### Pin or Unpin projects

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
    - When you pin a project, a message (for example, `New Project was pinned`) is displayed at the bottom of the page to confirm that your project is pinned.
    - Click **Undo** near the message to undo this action. 

4. To filter and display only the pinned projects, click **Pinned projects** on the top-right side drop-down list. 

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/filter-pinned-projects-only.png" style="opacity: 0.8"/></div>
  <i>Figure 11: Filter only pinned projects.</i>

Now, you can see all the pinned projects only. 

5. To filter and display only the unpinned projects, click **Unpinned projects** on the top-right side drop-down list. Now, you can see all the unpinned projects only.

6. To view all the projects (both the **Pinned** and **Unpinned** projects), click **All projects** on the top-right side drop-down list.  


#### Duplicate a project

The **Duplicate project** feature allows you to duplicate projects to a target workspace optionally importing the settings, tasks, and annotations. Duplicate a project by using the Project’s settings or Project card’s more menu (three dots **...**).

To duplicate a project:

- Navigate to your workspace page to see the project card with the three dots (**...**) and click **Duplicate project**.
      
  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/duplicate-project.png" style="opacity: 0.8"/></div>
  <i>Figure 16: Duplicate project button.</i>
   
- When duplicating, a pop-up window appears. Now, you can choose a destination workspace for a newly duplicated project using the following options:

  - Duplicate project with only settings.
  - Duplicate project with both settings and data.
  - Duplicate with settings, data, and all annotations.

    <br>
    <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/duplicate-options-settings.png" style="opacity: 0.8"/></div>
    <i>Figure 17: Duplicate project options.</i>

- When choosing the last option, you also can choose if you would like to make annotations **Ground Truth** or not. In the **Duplicate** window, you can also give duplicated project new name and description.

    <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/save-duplicate-project.png" style="opacity: 0.8"/></div>
    <i>Figure 18: Select the location to save your duplicate project.</i>

- Finally, the duplicated project is created. 
    <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/created-a-duplicated-project.png" style="opacity: 0.8"/></div>
    <i>Figure 19: Create a duplicate project.</i>

### Delete a workspace

You can only delete a workspace if it has no projects. If you want to delete a workspace, first delete the projects or move them to another workspace. 

To delete a workspace, do the following:
1. In the Label Studio UI, open the workspace.
2. Click the gear icon next to the workspace name.
3. In the dialog box that appears, click **Delete Workspace**. If the button is not available to select, the workspace still contains projects. 

  <br>
  <div style="margin:auto; text-align:center;"><img class="gif-border" src="/images/delete-workspace.png" style="opacity: 0.8"/></div>
  <i>Figure 10: Delete a workspace.</i>