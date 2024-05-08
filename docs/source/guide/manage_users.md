---
title: User management overview
short: User management 
tier: enterprise
type: guide
order: 0
order_enterprise: 366
meta_title: User management overview
meta_description: User management options available in Label Studio Enterprise
section: "Manage Your Organization"
---

User management can be a crucial component in your data annotation workflow. 

Data labeling often deals with sensitive or proprietary information, and controlling who has access to this data is vital to protect it from unauthorized access or misuse. By implementing robust user management, you can ensure that only authorized user accounts can access specific datasets. This is particularly important in environments that handle sensitive data, such as medical records or personal information, where data privacy regulations like GDPR or HIPAA might apply.

Furthermore, user management streamlines the workflow and enhances the efficiency of data labeling projects. Because different users can have distinct roles, you can customize your projects to so that each user has the appropriate tools and data access needed to perform their tasks effectively. This not only improves the accuracy and consistency of the data labeling process, but also minimizes the risk of errors or conflicts caused by unauthorized access or modifications. 

Label Studio Enterprise user management options include:

* **Role-Based Access Control (RBAC)**: Roles dictate the level of access that a users has and what actions they are able to complete. For more information about these roles, see [Roles and Permissions](admin_roles). For information about assigning roles, see [Manage user accounts](admin_manage_lse).

* **User workflows through roles**: You can also use roles to design annotation workflows for your users. For example, you can use the project settings to configure separate instructions to display to reviewers and annotators. For more information, see [Project setup](setup_project).

* **User Activity Monitoring**: Administrators can track user activities, such as who labeled what data and when, through an activity log. For more information, see [Activity logs](admin_logs). 

* **Projects and Workspaces**: You can control project visibility by using workspace and project membership. Users with the Manager, Annotator, or Reviewer role must be added as a member in order to view a workspace or project. Workspaces are used to group projects, and membership cascades down to projects within the workspace. For more information, see [Project setup](setup_project).

* **SSO/SAML and SCIM Integration**: For enterprises using Single Sign-On (SSO) or System for Cross-domain Identity Management (SCIM), Label Studio Enterprise allows mapping groups to roles at both the organization and project levels. For more information, see [SSO and SAML setup](auth_setup) and [SCIM2 setup](scim_setup). 

* **Customization and Programmability**: You can programmatically assign roles to users and manage user accounts through API endpoints, allowing for automation and integration with external systems. For more information, see our [API reference](/api/#tag/Users). 
