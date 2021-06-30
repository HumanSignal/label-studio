---
title: Set up authentication for Label Studio
short: Set up authentication
badge: <i class='ent'></i>
type: guide
order: 221
meta_title: Authentication for Label Studio Enterprise
meta_description: Label Studio Enterprise documentation for setting up SSO and LDAP authentication for your data labeling, machine learning, and data science projects.
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

Set up single sign-on using SAML to manage access to Label Studio using your existing Identity Provider (IdP), or use LDAP authentication.

<div class="enterprise"><p>
SSO and LDAP authentication are only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

## Set up SAML SSO

The organization owner for Label Studio Enterprise can set up SSO & SAML for the instance. Label Studio Enterprise supports the following IdPs:
- Microsoft Active Directory
- OneLogin
- others that use SAML assertions

After you set up SSO, you can no longer use native authentication to access the Label Studio UI unless you have the Owner role. 

## Set up LDAP authentication 

After you set up LDAP authentication, you can no longer use native authentication to log in to the Label Studio UI unless you have the Owner role. 

Set up LDAP authentication and assign LDAP users to your Label Studio Enterprise organization using environment variables in Docker. You can also map specific AD groups to specific organization roles in Label Studio Enterprise, making it easier to manage role-based access control (RBAC) in Label Studio Enterprise.

You can refer to this example environment variable file for your own LDAP setup:
```
AUTH_LDAP_ENABLED=1
AUTH_LDAP_SERVER_URI=ldaps://ldap.example.com #Use ldaps to secure the LDAP connection
AUTH_LDAP_BIND_DN=uid=user,ou=sysadmins,o=12abc345de12abc345de12ab,dc=zexample,dc=com
AUTH_LDAP_BIND_PASSWORD=zexamplepass
AUTH_LDAP_USER_DN_TEMPLATE=uid=%(user)s,ou=Users,o=12abc345de12abc345de12ab,dc=example,dc=com

# Group parameters
AUTH_LDAP_GROUP_SEARCH_BASE_DN=ou=Users,o=12abc345de12abc345de12ab,dc=example,dc=com
AUTH_LDAP_GROUP_SEARCH_FILTER_STR=(objectClass=groupOfNames)
AUTH_LDAP_GROUP_TYPE=ou

# Populate the user from the LDAP directory, values below are set by default 
AUTH_LDAP_USER_ATTR_MAP_FIRST_NAME=givenName
AUTH_LDAP_USER_ATTR_MAP_LAST_NAME=sn
AUTH_LDAP_USER_ATTR_MAP_EMAIL=mail

# Map AD groups with specific Label Studio Enterprise roles
AUTH_LDAP_ORGANIZATION_ROLE_ADMINISTRATOR=cn=admins,ou=users,o=12abc345de12abc345de12ab,dc=example,dc=com
AUTH_LDAP_ORGANIZATION_ROLE_MANAGER=cn=managers,ou=users,o=12abc345de12abc345de12ab,dc=example,dc=com
AUTH_LDAP_ORGANIZATION_ROLE_COORDINATOR=cn=coords,ou=users,o=12abc345de12abc345de12ab,dc=example,dc=com
AUTH_LDAP_ORGANIZATION_ROLE_COLLABORATOR=cn=collabs,ou=users,o=12abc345de12abc345de12ab,dc=example,dc=com
AUTH_LDAP_ORGANIZATION_ROLE_NOT_ACTIVATED=cn=not,ou=users,o=12abc345de12abc345de12ab,dc=example,dc=com
AUTH_LDAP_ORGANIZATION_ROLE_DEACTIVATED=

# Specify organization to assign on the platform 
AUTH_LDAP_ORGANIZATION_OWNER_EMAIL=heartex@heartex.net
```

After setting up LDAP authentication for your on-premises Label Studio Enterprise instance, you can use the credentials `guest1` and `guest1password` to log in and test the setup. 


