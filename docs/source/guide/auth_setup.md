---
title: Set up SSO authentication for Label Studio
short: SSO and SAML
tier: enterprise
type: guide
order: 0
order_enterprise: 375
meta_title: Authentication for Label Studio Enterprise
meta_description: Label Studio Enterprise documentation for setting up SSO and LDAP authentication for your data labeling, machine learning, and data science projects.
section: "Administration"

---

Set up single sign-on using SAML to manage access to Label Studio using your existing Identity Provider (IdP), or use LDAP authentication.

<div class="enterprise-only">

SSO and LDAP authentication are only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="https://labelstud.io/guide/label_studio_compare.html">Label Studio Features</a> to learn more.

</div>

To more easily [manage access to Label Studio Enterprise](manage_users.html), you can map SAML or LDAP groups to both `roles` or `workspaces`. 

## Set up SAML SSO

The organization owner for Label Studio Enterprise can set up SSO & SAML for the instance. Label Studio Enterprise supports the following IdPs:
- Microsoft Active Directory
- [Okta](https://www.youtube.com/watch?v=Dr-_hyWIw4M)
- OneLogin
- [Ping Federate and Ping Identity SAML SSO Setup Example](pingone.html)
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

## Set up LDAP authentication 

After you set up LDAP authentication, you can no longer use native authentication to log in to the Label Studio UI. Set up LDAP authentication and assign LDAP users to your Label Studio Enterprise organization using environment variables in Docker. 

You can also map specific LDAP groups to specific organization roles and workspaces in Label Studio Enterprise, making it easier to set up and manage role-based access control (RBAC) and project access in Label Studio Enterprise. 

You can refer to this example environment variable file for your own LDAP setup:

```bash 
AUTH_LDAP_ENABLED=1

# Use ldaps to secure the LDAP connection
AUTH_LDAP_SERVER_URI=ldaps://ldap.example.com
# LDAP admin credentials    
AUTH_LDAP_BIND_DN=uid=user,ou=sysadmins,o=123abc,dc=zexample,dc=com
AUTH_LDAP_BIND_PASSWORD=password123

# Allow users to use usernames (not only emails) to log into Label Studio
USE_USERNAME_FOR_LOGIN=1

# Simple user search in LDAP groups
AUTH_LDAP_USER_DN_TEMPLATE=uid=%(user)s,ou=Users,o=123abc,dc=example,dc=com

# Specify organization to assign it to all users on the platform
# Warning: the user with this email must be registered before any LDAP users log in 
AUTH_LDAP_ORGANIZATION_OWNER_EMAIL=heartex@heartex.net

# Populate the user from the LDAP directory:
# firstName, lastName, mail, sAMAccountName are taken from your LDAP record 
AUTH_LDAP_USER_ATTR_MAP_FIRST_NAME=firstName
AUTH_LDAP_USER_ATTR_MAP_LAST_NAME=lastName
# Specify the field to use for AUTH_LDAP_USER_QUERY_FIELD as 'email'
AUTH_LDAP_USER_ATTR_MAP_EMAIL=mail
# Specify the field to use for AUTH_LDAP_USER_QUERY_FIELD as 'username' 
AUTH_LDAP_USER_ATTR_MAP_USERNAME=sAMAccountName

# Query the authenticating user in Label Studio, it can be [email|username]
AUTH_LDAP_USER_QUERY_FIELD=email

# Group parameters
AUTH_LDAP_GROUP_SEARCH_BASE_DN=ou=Users,o=group-id,dc=example,dc=com
AUTH_LDAP_GROUP_SEARCH_FILTER_STR=(objectClass=groupOfNames)
AUTH_LDAP_GROUP_TYPE=ou
```

If you want to use a recursive scan to search in several LDAP groups to grant access to Label Studio, instead of relying on the simple search used by `AUTH_LDAP_USER_ON_TEMPLATE`, update your environment variables file like the following:
```bash
# Leave this parameter empty
AUTH_LDAP_USER_DN_TEMPLATE=""
# Specify the groups that you want to be able to log in, separated by ';' 
AUTH_LDAP_USER_SEARCH_BASES="ou=guests,dc=domain,dc=com;ou=owners,dc=domain,dc=com"
```


## User Role Mappings

Map LDAP groups to specific Label Studio Enterprise roles using `;` to specify several groups.

```bash
AUTH_LDAP_ORGANIZATION_ROLE_ADMINISTRATOR=cn=admins,ou=users,o=123abc,dc=example,dc=com 
AUTH_LDAP_ORGANIZATION_ROLE_MANAGER=cn=managers,ou=users,o=123abc,dc=example,dc=com 
AUTH_LDAP_ORGANIZATION_ROLE_REVIEWER=cn=reviewers,ou=users,o=123abc,dc=example,dc=com
AUTH_LDAP_ORGANIZATION_ROLE_ANNOTATOR=cn=annotators,ou=users,o=123abc,dc=example,dc=com;cn=guests,ou=users,o=123abc,dc=example,dc=com
AUTH_LDAP_ORGANIZATION_ROLE_NOT_ACTIVATED=cn=not,ou=users,o=123abc,dc=example,dc=com 
AUTH_LDAP_ORGANIZATION_ROLE_DEACTIVATED=cn=deactivated,ou=users,o=123abc,dc=example,dc=com
```


## Workspace Mappings

Map LDAP groups to specific Label Studio workspaces. Use a JSON format where keys are workspace titles and values are LDAP groups. Split groups with `;` to specify several groups. 

```bash
AUTH_LDAP_ORGANIZATION_WORKSPACES='{"Workspace 1":"cn=team1,ou=users,o=60cbc901ec2e8e387a3b2d3e,dc=jumpcloud,dc=com","Workspace 2":"cn=team2,ou=users,o=60cbc901ec2e8e387a3b2d3e,dc=jumpcloud,dc=com"}'
```


## Manage user access only with LDAP or SSO 

If you want to manage Label Studio roles and workspaces entirely with LDAP or single sign-on (SSO), add the following to your environment variable file:

```
MANUAL_PROJECT_MEMBER_MANAGEMENT=0
MANUAL_WORKSPACE_MANAGEMENT=0
MANUAL_ROLE_MANAGEMENT=0
```

Setting these options disables the Label Studio API and UI options to assign roles and workspaces for specific users within Label Studio and relies entirely on the settings in the environment variable file.

### Enabling TLS on LDAP/Active Directory

To enable a secure Transport Layer Security (TLS) connection on LDAP/Active Directory, add the following env variables:

```bash
AUTH_LDAP_CONNECTION_OPTIONS="OPT_X_TLS_CACERTFILE=/path/to/cert.crt;OPT_X_TLS_NEWCTX=0"
```

Where `OPT_X_TLS_CACERTFILE` points to a file with certificates. If you’re using self-signed certificates, you’ll need to add `OPT_X_TLS_NEWCTX=0` as the last entry of the `AUTH_LDAP_CONNECTION_OPTIONS` env variable.
