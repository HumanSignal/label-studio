---
title: Set up SSO authentication for Label Studio
short: SSO and SAML
tier: enterprise
type: guide
order: 0
order_enterprise: 384
meta_title: SSO authentication for Label Studio Enterprise
meta_description: Label Studio Enterprise documentation for setting up SSO authentication for your data labeling, machine learning, and data science projects.
section: "Manage Your Organization"

---

Set up single sign-on using SAML to manage access to Label Studio using your existing Identity Provider (IdP).

!!! error Enterprise
    SSO authentication is only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="https://labelstud.io/guide/label_studio_compare.html">Label Studio Features</a> to learn more.


To more easily [manage access to Label Studio Enterprise](manage_users.html), you can map SAML groups to both `roles` or `workspaces`. 

## Set up SAML SSO

The organization owner for Label Studio Enterprise can set up SSO & SAML for the instance. Label Studio Enterprise supports the following IdPs:
- [Okta](https://www.youtube.com/watch?v=Dr-_hyWIw4M)
- [Google SAML](google_saml.html)
- [Ping Federate and Ping Identity SAML SSO Setup Example](pingone.html)
- OneLogin
- Microsoft Active Directory
- Others that use SAML assertions

After setting up the SSO, you can use native authentication to access the Label Studio UI, however it's not a recommended option especially for the user with the Owner role.

- You can use SSO along with normal login. This is not a recommended option.

- You can prevent a user from creating his own organization by using [DISABLE_SIGNUP_WITHOUT_LINK](signup.html#Restrict-signup-for-local-deployments) option.

### Connect your Identity Provider to Label Studio Enterprise

Set up Label Studio Enterprise as a Service Provider (SP) with your Identity Provider (IdP) to use SAML authentication. 

The details will vary depending on your IdP, but in general you will complete the following steps:

###### From Label Studio:

1. Click the menu in the upper left and select **Organization**. 

    ![Screenshot of Organization in the Label Studio menu](/images/general/menu_organization.png)
    
    If you do not see the option to select **Organization**, you are not logged in with the appropriate role. 
2. Select **SSO & SAML** in the upper right. 
3. In the **Organization** field, ensure the domain matches the domain used for your organization in your IdP.
4. Copy the following URLs:
    
    * **Assertion Consumer Service (ACS) URL with Audience (EntityID), and Recipient (Reply) details**---The IdP uses this URL to redirect users to after a successful authentication.
    * **Login URL**---This is the URL that users will use to log in to Label Studio. 
    * **Logout URL**---This is the URL used to redirect users after successfully logging out of Label Studio.

###### From your IdP:

1. Paste the URLs copied from Label Studio in the appropriate location. 
2. Generate a metadata XML file, or a URL that specifies the metadata for the IdP.
3. Set up or confirm setup of the following SAML attributes. Label Studio Enterprise expects specific attribute mappings for user identities.

    | Data | Required Attribute |
    | --- | --- |
    | Email address | Email |
    | First or given name | FirstName |
    | Last or family name | LastName |
    | Group name | Groups | 



###### From Label Studio:

1. Return to the SSO & SAML page. 
2. Upload the metadata XML file or specify the metadata URL.  
3. Set up group mappings. These can also be added or edited later.

    Ensure the group name you enter is the same as the group name sent as an attribute in a SAML authentication response by your IdP.

    * **Organization Roles to Groups Mapping**---Map groups to roles at the organization level. The role set at the organization level is the default role of the user and is automatically assigned to workspaces and projects. For more information on roles, see [Roles in Label Studio Enterprise](manage_users#Roles-in-Label-Studio-Enterprise).
    
        You can map multiple groups to the same role. Note that users who are **Not Activated** or **Deactivated** do not count towards the seat limit for your account. 
    * **Workspaces to Groups Mapping**---Add groups as members to workspaces. Users with Manager, Reviewer, or Annotator roles can only see workspaces after they've been added as a member to that workspace.
    
        Select an existing workspace or create a new one. You can map multiple groups to the same workspace. 
    * **Projects to Groups Mapping**---Map groups to roles at the project level. Project-level roles can be **Annotator**, **Reviewer**, or **Inherit**. 
    
        You can map a group to different roles across multiple projects. You can also map multiple groups to the same roles and the same projects. For more information on roles, see [Roles in Label Studio Enterprise](manage_users#Roles-in-Label-Studio-Enterprise). 
    
        If you select **Inherit**, the group will inherit the role set above under **Organization Roles to Groups Mapping.** If the group is inheriting the Not Activated role, the users are mapped to the project, but they are not actually assigned to the project until the group is synced (meaning that the user authenticates with SSO). 
4. Click **Save**.

5. Test the configuration by logging in to Label Studio Enterprise with your SSO account.


### Setup SAML SSO with Okta video tutorial

<iframe class="video-border" width="560" height="315" src="https://www.youtube.com/embed/Dr-_hyWIw4M" width="100%" height="400vh" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>


## Manage user access only with SSO 

If you want to manage Label Studio roles and workspaces entirely with single sign-on (SSO), add the following to your environment variable file:

```
MANUAL_PROJECT_MEMBER_MANAGEMENT=0
MANUAL_WORKSPACE_MANAGEMENT=0
MANUAL_ROLE_MANAGEMENT=0
```

Setting these options disables the Label Studio API and UI options to assign roles and workspaces for specific users within Label Studio and relies entirely on the settings in the environment variable file.

!!! info Tip
    If you are using the SaaS version of Label Studio (Label Studio Enterprise Cloud) and would like to enable these restrictions for your organization, [open a ticket](https://support.humansignal.com/hc/en-us/requests/new) to submit your request.  
    
    If requested, we can also disable the common login option for your organization. When disabled, users can only use the SSO login fields and the common login  option is disabled completely. 


