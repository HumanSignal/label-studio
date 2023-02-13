---
title: Set up authentication for Label Studio
short: Set up authentication
tier: enterprise
type: guide
order: 113
order_enterprise: 139
meta_title: Authentication for Label Studio Enterprise
meta_description: Label Studio Enterprise documentation for setting up SSO and LDAP authentication for your data labeling, machine learning, and data science projects.
section: "Install"

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

Set up Label Studio Enterprise as a Service Provider (SP) with your Identity Provider (IdP) to use SAML authentication. Configure the IdP settings and set up the SAML attributes. 

1. In the Label Studio Enterprise UI, click the hamburger icon and select **Organization**.
2. Click **SSO & SAML**.
3. In the **Organization** field, specify the domain used for your organization by your SAML IdP. 
4. Open your IdP configuration options and add the following URLs from Label Studio Enterprise to your IdP:
   - Copy the **URL for the Assertion Consumer Service (ACS)** that the IdP uses to redirect users to after a successful authentication and paste it into the appropriate location in your IdP configuration options.
   - Copy the **login URL** used for logging in to Label Studio Enterprise and paste it into the appropriate location in your IdP configuration options.
   - Copy the **logout URL** used to redirect users after successfully logging out of Label Studio Enterprise and paste it into the appropriate location in your IdP configuration options.
5. In your IdP, generate a metadata XML file, or a URL that specifies the metadata for the IdP. 
6. In Label Studio Enterprise, upload the metadata XML file or specify the metadata URL. 
7. In your IdP, set up or confirm setup of the following SAML attributes. Label Studio Enterprise expects specific attribute mappings for user identities.
   | Data | Required Attribute |
   | --- | --- |
   | Email address | Email |
   | First or given name | FirstName |
   | Last or family name | LastName |
   | Group name | Groups |
8. If you want users in specific groups to get access to specific workspaces in Label Studio Enterprise, map the **Workspace name** to a **Group** passed as SAML attributes in the SAML authentication response.
    - In the **Workspaces to Groups Mapping** section, click **+ Add Mapping**.
    - In the **Workspace** field, type a new workspace name or select a workspace from the drop-down list. Then, type a **Group** that matches a group name sent as an attribute in a SAML authentication response by your IdP. You can map multiple groups to the same workspace. 
    - Click **+ Add Mapping** to map additional workspaces to groups. 
9. You can also map specific user groups to specific user roles in Label Studio Enterprise. 
   - In the **Roles to Groups Mapping** section, click **+ Add Mapping**.
   - Select a **Role** from the drop-down list of options, then type a **Group** that matches a group name sent as an attribute in a SAML authentication response by your IdP. You can map multiple groups to the same role. 
   - Click **+ Add Mapping** to map additional roles to groups. 
10. Click **Save** to save your SAML and SSO settings. 

Test the configuration by logging in to Label Studio Enterprise with your SSO account.

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
