---
title: Organization management
short: Overview
tier: enterprise
type: guide
order: 0
order_enterprise: 351
meta_title: Organization management
meta_description: Brief overview of organization structures in Label Studio Enterprise. 
section: "Manage Your Organization"
date: 2024-02-16 15:44:07
---


To manage organization membership, use the **Organization** page in Label Studio. Only users with the Owner or Administrator role can access this page:

![Screenshot of organization page](/images/admin/org_page.png)

When you sign up for Label Studio Enterprise for the first time, an organization associated with your account is automatically created. You become the owner of that organization. People who join Label Studio Enterprise from an invitation link or with an LDAP or SSO role join an existing organization.

If permitted by your Label Studio Enterprise plan, you can create organizations in Label Studio to further separate access to data and projects. For example, you could create separate organizations to separate work and access between completely unrelated departments. If some departments might collaborate with each other on a project, you can use one organization for both and instead use workspaces to organize the projects that they might or might not be collaborating on.

For example, you might set up one of the following possible configurations:

- One organization for your company, with one workspace for the support department and another for the development team, with specific projects in each workspace for different types of customer requests.

  <img style="width:70%" src="/images/LSE/LSE-one-org-many-workspaces.jpg" alt="Diagram showing Label Studio with one organization with multiple workspaces and projects within each workspace."/>

- Multiple organizations, such as one for the customer claims department and another for the customer support department, with specific workspaces in each organization for specific types of insurance, such as home insurance claims and auto insurance claims, and specific projects in each workspace for types of claims, such as Accident Claims, Injury Claims, Natural Disaster Claims. The Customer support organization might have workspaces specific to the types of support queues, with projects for specific types of calls received.

  <img style="width:70%" src="/images/LSE/LSE-multiple-orgs-workspaces.jpg" alt="Diagram showing Label Studio with three organizations, each one with multiple workspaces and projects within each workspace."/>

  When you assign a user role to an organization member, they hold that role for all workspaces and projects for that organization.

Managers within an organization can see all workspaces in that organization, even if they don't have access to perform actions in them. Annotators and reviewers can only see projects, not workspaces.

If you have access to multiple organizations, use the **Organizations** page to switch between the organizations that you are a member of.