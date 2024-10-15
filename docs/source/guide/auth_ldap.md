---
title: Set up LDAP authentication for Label Studio
short: LDAP
tier: enterprise
type: guide
order: 0
order_enterprise: 383
meta_title: LDAP authentication for Label Studio Enterprise
meta_description: Label Studio Enterprise documentation for setting up LDAP authentication for your data labeling, machine learning, and data science projects.
section: "Manage Your Organization"
date: 2024-05-24 09:08:58
---

Set up LDAP authentication to manage access to Label Studio.

!!! error Enterprise
    LDAP authentication is only available in Label Studio Enterprise Edition and is only available for on-prem installations. If you're using Label Studio Community Edition, see <a href="https://labelstud.io/guide/label_studio_compare.html">Label Studio Features</a> to learn more.


To more easily [manage access to Label Studio Enterprise](manage_users.html), you can map LDAP groups to both `roles` or `workspaces`. 

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

## Manage user access only with LDAP 

If you want to manage Label Studio roles and workspaces entirely with LDAP, add the following to your environment variable file:

```
MANUAL_PROJECT_MEMBER_MANAGEMENT=0
MANUAL_WORKSPACE_MANAGEMENT=0
MANUAL_ROLE_MANAGEMENT=0
```

Setting these options disables the Label Studio API and UI options to assign roles and workspaces for specific users within Label Studio and relies entirely on the settings in the environment variable file.


## Enabling TLS on LDAP/Active Directory

To enable a secure Transport Layer Security (TLS) connection on LDAP/Active Directory, add the following env variables:

```bash
AUTH_LDAP_CONNECTION_OPTIONS="OPT_X_TLS_CACERTFILE=/path/to/cert.crt;OPT_X_TLS_NEWCTX=0"
```

Where `OPT_X_TLS_CACERTFILE` points to a file with certificates. If you’re using self-signed certificates, you’ll need to add `OPT_X_TLS_NEWCTX=0` as the last entry of the `AUTH_LDAP_CONNECTION_OPTIONS` env variable.