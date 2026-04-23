---
title: Set up SSO authentication for Label Studio
short: SSO and SAML
tier: enterprise
type: guide
order: 0
order_enterprise: 387
meta_title: SSO authentication for Label Studio Enterprise
meta_description: Label Studio Enterprise documentation for setting up SSO authentication for your data labeling, machine learning, and data science projects.
section: "Manage Your Organization"
parent: "admin_auth"
parent_enterprise: "admin_auth"
---

Set up single sign-on using SAML to manage access to Label Studio using your existing Identity Provider (IdP).

!!! error Enterprise
    SSO authentication is only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="https://labelstud.io/guide/label_studio_compare.html">Label Studio Features</a> to learn more.


To more easily [manage access to Label Studio Enterprise](manage_users.html), you can map SAML groups to both `roles` or `workspaces`. 

## Set up SAML SSO

The organization Owner or Administrator for Label Studio Enterprise can set up SSO & SAML. 

Label Studio Enterprise supports the following IdPs:
- [Okta](https://www.youtube.com/watch?v=Dr-_hyWIw4M)
- [Google SAML](google_saml.html)
- [Ping Federate and Ping Identity SAML SSO Setup Example](pingone.html)
- Microsoft Entra ID (formerly Azure Active Directory, Azure AD)
- Auth0
- Others that use SAML assertions

After setting up the SSO, you can use native authentication to access the Label Studio UI. 

- You can use SSO along with a normal login. This is not a recommended option, especially for the user in the Owner role. 

- You can prevent users from registering a new account through the `/user/signup` page by setting the following environment variable:

```bash
LABEL_STUDIO_DISABLE_SIGNUP_WITHOUT_LINK=true
```

### Connect your Identity Provider to Label Studio Enterprise

Set up Label Studio Enterprise as a Service Provider (SP) with your Identity Provider (IdP) to use SAML authentication. 

The details will vary depending on your IdP, but in general you will complete the following steps:

#### From Label Studio:

1. Go to **Organization > Security > SSO & SCIM**. 
    
    If you do not see the option to select **Organization**, you are not logged in with the appropriate role. 
2. Under **Domain**, ensure the domain matches the domain used for your organization in your IdP. Click **Next**. 
3. Select your IdP and copy the service provider details:
    * **ACS URL**---The IdP uses this URL to redirect users to after a successful authentication. Format: `https://<your-host>/saml/<token>/acs`
    * **Entity ID**---The IdP uses this URL to identify the service provider. Format: `https://<your-host>/saml/<token>/acs`
    * **Login URL**---This is the URL that users will use to log in to Label Studio. Format: `https://<your-host>/saml/<token>/login`
    * **Logout URL**---This is the URL used to redirect users after successfully logging out of Label Studio. Format: `https://<your-host>/saml/<token>/logout`

!!! note
    Label Studio does not implement SAML Single Logout (SLO) to the IdP. The logout URL only ends the local Label Studio session.

#### From your IdP:

1. Paste the URLs copied from Label Studio in the appropriate location. 
2. Generate a metadata XML file, or a URL that specifies the metadata for the IdP.
3. Set up or confirm setup of the following SAML attributes. Label Studio Enterprise expects specific attribute mappings for user identities.

**The default attribute names are:**

| Data | Default Attribute |
| --- | --- |
| Email address | Email |
| First or given name | FirstName |
| Last or family name | LastName |
| Group name | Groups | 

!!! info Tip
    Different Identity Providers use different attribute names. 
    
    Label Studio provides presets in the SSO & SAML settings page to quickly configure the correct attribute mappings for popular IdPs. You can also manually configure custom attribute names if your IdP uses different values.

**Attribute presets by IdP:**

| IdP | Email | FirstName | LastName | Groups |
| --- | --- | --- | --- | --- |
| Default | `Email` | `FirstName` | `LastName` | `Groups` |
| Auth0 | `email` | `given_name` | `family_name` | `groups` |
| Entra ID (short) | `emailAddress` | `givenName` | `surname` | `groups` |
| Google | `Email` | `FirstName` | `LastName` | `Groups` |
| PingOne | `emailAddress` | `givenName` | `surname` | `Groups` |
| Okta | `email` | `firstName` | `lastName` | `groups` |

**Microsoft Entra ID with full URI format:**

If your Entra ID is configured with default claim URIs, use:

| Attribute | URI |
| --- | --- |
| Email | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` |
| FirstName | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname` |
| LastName | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname` |
| Groups | `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups` |

!!! warning "Important: Group names vs. Object IDs in Entra ID"
    If you use group-based mappings (roles, workspaces, projects), you must configure Entra ID to send **group names** (not Object IDs) in the groups claim. 
    
    In **User Attributes & Claims > Groups returned in claim**, select **Groups assigned to the application** and set **Source attribute** to `sAMAccountName` or another human-readable group property. 
    
    Sending Object IDs instead of names will prevent group mappings from working correctly.

#### From Label Studio:

1. Return to the SSO & SAML page. 
2. Upload the metadata XML file or specify the metadata URL.  
3. Select the appropriate IdP provider preset (e.g. `azure` for Entra ID) to auto-fill attribute mapping names, or configure them manually to match what your IdP sends.
4. Set up group mappings. These can also be added or edited later.

    Ensure the group name you enter is the same as the group name sent as an attribute in a SAML authentication response by your IdP.

    * **Organization Roles to Groups Mapping**---Map groups to roles at the organization level. The role set at the organization level is the default role of the user and is automatically assigned to workspaces and projects. For more information on roles, see [Roles in Label Studio Enterprise](manage_users#Roles-in-Label-Studio-Enterprise).
    
        You can map multiple groups to the same role. Note that users who are **Not Activated** or **Deactivated** do not count towards the seat limit for your account. 
    * **Workspaces to Groups Mapping**---Add groups as members to workspaces. Users with Manager, Reviewer, or Annotator roles can only see workspaces after they've been added as a member to that workspace.
    
        Select an existing workspace or create a new one. You can map multiple groups to the same workspace. 
    * **Projects to Groups Mapping**---Map groups to roles at the project level. Project-level roles can be **Annotator**, **Reviewer**, or **Inherit**. 
    
        You can map a group to different roles across multiple projects. You can also map multiple groups to the same roles and the same projects. For more information on roles, see [Roles in Label Studio Enterprise](manage_users#Roles-in-Label-Studio-Enterprise). 
    
        If you select **Inherit**, the group will inherit the role set above under **Organization Roles to Groups Mapping.** If the group is inheriting the Not Activated role, the users are mapped to the project, but they are not actually assigned to the project until the group is synced (meaning that the user authenticates with SSO). 
5. Click **Save**.

6. Test the configuration by logging in to Label Studio Enterprise with your SSO account.

#### Group mapping behavior

| Mapping Type | Behavior |
| --- | --- |
| Organization Roles (`roles_groups`) | If a user belongs to multiple role groups, the most elevated role wins. Available roles: Administrator, Manager, Reviewer, Annotator. The Owner role cannot be assigned via SAML or SCIM. |
| Workspaces (`workspaces_groups`) | A user can be mapped to multiple workspaces through multiple group memberships. Workspaces are automatically created if they do not exist when a mapping is triggered. |
| Projects (`projects_groups`) | Format: `{"project_id": <id>, "group": "<GroupName>", "role": "<Role>"}`. Available project roles: Annotator, Reviewer, or Inherit. The most elevated role wins when a user is in multiple groups mapped to the same project. |

!!! note
    Group name matching is **case-sensitive** for all mapping types. `LS-Admins` and `ls-admins` are treated as different groups. Ensure exact casing matches between your IdP group names and Label Studio mapping configurations.

### SAML SSO Settings API

You can also configure SAML settings programmatically using the API:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/saml/settings` | Retrieve current SAML settings (includes computed SP URLs) |
| `POST` | `/api/saml/settings` | Update SAML settings (partial update supported) |
| `DELETE` | `/api/saml/settings` | Reset SAML configuration |
| `POST` | `/api/saml/settings/validate-metadata-url` | Validate a metadata URL is reachable and contains valid XML |

!!! warning
    Using `DELETE /api/saml/settings` clears all SCIM group assignments (`WorkspaceGroupAssignment`, `OrganizationGroupAssignment`, and `ProjectGroupAssignment` records) and resets `ScimGroupSettings` for the organization. If you need to reconfigure SAML, re-save your SCIM settings afterward and wait for the next group sync to rebuild assignments.

**Example: Configure SAML via the API**

```bash
curl -X POST "https://<your-label-studio-host>/api/saml/settings" \
  -H "Authorization: Token <owner-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "contoso.com",
    "metadata_url": "https://login.microsoftonline.com/<tenant-id>/federationmetadata/2007-06/federationmetadata.xml?appid=<app-id>",
    "idp_provider": "azure",
    "mapping_email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "mapping_first_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    "mapping_last_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
    "mapping_groups": "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups",
    "roles_groups": [
      ["Administrator", "LS-Admins"],
      ["Annotator", "LS-Annotators"]
    ],
    "workspaces_groups": [
      ["Engineering", "LS-Engineering-Team"]
    ],
    "projects_groups": [
      {"project_id": 42, "group": "LS-Project42-Reviewers", "role": "Reviewer"}
    ]
  }'
```

### Setup SAML SSO with Okta video tutorial

<iframe class="video-border" width="560" height="315" src="https://www.youtube.com/embed/Dr-_hyWIw4M" width="100%" height="400vh" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

### Set up SAML SSO with Microsoft Entra ID

To set up SAML SSO specifically with Microsoft Entra ID (formerly Azure AD):

#### Step 1: Create the Enterprise Application in Entra ID

1. In the Azure Portal, go to **Entra ID → Enterprise Applications → New Application**.
2. Select **Create your own application** → **Integrate any other application not found in the gallery**.
3. Name it (e.g. `Label Studio SSO`) and create it.

#### Step 2: Configure SAML in Entra ID

1. Go to **Single sign-on → SAML**.
2. Under **Basic SAML Configuration**:
    - **Identifier (Entity ID)**: Paste the ACS URL from Label Studio.
    - **Reply URL (ACS URL)**: Paste the same ACS URL.
    - **Sign on URL**: Paste the Login URL from Label Studio.
3. Under **User Attributes & Claims**, configure the attribute mappings using the Entra ID presets [shown above](#from-your-idp).
4. Under **SAML Signing Certificate**, download the **Federation Metadata XML** file (or copy the **App Federation Metadata URL**).

#### Step 3: Configure SAML in Label Studio

1. Go to **Organization → SSO & SAML**.
2. In the **Domain** field, enter the email domain(s) for your organization (comma-separated, e.g. `contoso.com`). This is used for domain-based SSO routing when users enter their email on the login page.
3. Upload the **Federation Metadata XML** file downloaded from Entra ID, or paste the **App Federation Metadata URL** in the metadata URL field.
4. Select `azure` as the IdP provider preset to auto-fill attribute mapping names, or configure them manually.
5. Configure group mappings as needed.
6. Click **Save**.

#### Step 4: Assign users and test

1. In Entra ID, go to **Enterprise Application → Users and groups → Add user/group**.
2. Assign users or groups to the application.
3. Test by navigating to the Label Studio Login URL, or by going to `https://<your-host>/saml/sso-domain` and entering your email---Label Studio will look up the SAML config by domain and redirect to Entra ID.
4. After authenticating with Entra ID, you should be redirected back to Label Studio and logged in.


## JIT (Just-In-Time) provisioning

When a user authenticates via SAML for the first time and no account exists, Label Studio automatically creates the account:

- The user is created with the email from the SAML assertion.
- First name and last name are set from the assertion attributes (if mapped).
- The user is added to the organization with the **organization's default role**.
- Group mappings are then applied: org role, workspaces, and projects are assigned based on the SAML groups attribute.

On subsequent SAML logins, the user's name is updated from the assertion, and group mappings are re-evaluated (roles, workspaces, projects are synced to match current group membership).

### NameID format

Label Studio uses `urn:oasis:names:tc:SAML:2.0:nameid-format:transient` as the default NameID format. The user's identity is resolved from the configured email attribute in the assertion, not from the NameID value.

## SAML user lifecycle

| Event | What happens in Label Studio |
| --- | --- |
| **First SAML login (new user)** | Account created (JIT), added to org with default role, then group mappings applied immediately. |
| **First SAML login (existing user, different org)** | User added to this org with default role, group mappings applied. |
| **Subsequent SAML login** | Name updated from assertion. Group mappings re-evaluated: roles, workspaces, and projects synced to match current groups (subject to manual management flags). |
| **User removed from all role groups** | If `manual_role_management` is off: role set to Deactivated on next login. If on: role unchanged. |
| **User removed from Entra ID app assignment** | No automatic change in Label Studio---user simply cannot authenticate via SSO anymore. Pair with SCIM deactivation for full lifecycle management. |


## SAML and SCIM interaction

If your organization uses both SAML SSO and SCIM provisioning, be aware of the following interactions:

- **Group mappings are configured separately.** SAML settings (`/api/saml/settings`) and SCIM settings (`/api/scim/settings`) each have their own `roles_groups`, `workspaces_groups`, and `projects_groups`. You can configure identical mappings in both, or use different mappings for each protocol.
- **SCIM project mappings take precedence over SAML.** When SCIM-driven project group assignments exist for a user, SAML skips its project role sync for that user entirely, to avoid conflicts.
- **Deleting SAML settings clears SCIM group assignments.** Using `DELETE /api/saml/settings` wipes all group assignment records and resets SCIM group settings for the organization. If you need to reconfigure SAML, re-save your SCIM settings afterward.
- **`manual_role_management` is shared.** The per-org override in SAML settings takes precedence over the billing/environment default for both SAML and SCIM role removal behavior.
- **SSO login can still change roles even with SCIM.** If a user authenticates via SAML and SAML role mappings are configured, the role may be re-evaluated on login based on SAML group attributes---potentially overriding a role set by SCIM. To avoid this, either use the same mappings in both, or configure role mappings in only one of the two.

For more information on SCIM setup, see [Set up SCIM2 for Label Studio](scim_setup.html).

## Manage user access only with SSO 

If you want to manage Label Studio roles and workspaces entirely with single sign-on (SSO), add the following to your environment variable file:

```
MANUAL_PROJECT_MEMBER_MANAGEMENT=0
MANUAL_WORKSPACE_MANAGEMENT=0
MANUAL_ROLE_MANAGEMENT=0
```

Setting these options disables the Label Studio API and UI options to assign roles and workspaces for specific users within Label Studio and relies entirely on the settings in the environment variable file.

| Flag | Scope | Default | Effect when disabled (`0` / `False`) |
| --- | --- | --- | --- |
| `MANUAL_ROLE_MANAGEMENT` | Org roles | `True` (manual allowed) | Org roles are managed exclusively by SAML/SCIM. Users removed from all role groups are set to Deactivated. Overridable per-org in SAML settings. |
| `MANUAL_WORKSPACE_MANAGEMENT` | Workspaces | `True` (manual allowed) | Workspace membership is managed exclusively by SAML/SCIM. On each SAML login, workspaces are fully re-synced from groups. SCIM removes workspace memberships when users leave groups. |
| `MANUAL_PROJECT_MEMBER_MANAGEMENT` | Projects | `True` (manual allowed) | Project membership is managed exclusively by SAML/SCIM. Project memberships are removed when users leave groups. |

!!! note
    The `manual_role_management` flag has a per-organization override in SAML settings (`SamlSettings.manual_role_management`). When set, the SAML override takes precedence over the environment/billing default for both SAML and SCIM role removal behavior.

!!! info Tip
    If you are using the SaaS version of Label Studio (Label Studio Enterprise Cloud) and would like to enable these restrictions for your organization, [open a ticket](https://support.humansignal.com/hc/en-us/requests/new) to submit your request.  
    
    If requested, we can also disable the common login option for your organization. When disabled, users can only use the SSO login fields and the common login  option is disabled completely. 

### Login page URL

You can also set the `LOGIN_PAGE_URL` environment variable to redirect the login page to the specified URL. 

## Troubleshooting SAML SSO

### SSO login redirects to an error page

- Verify the **ACS URL** in your IdP matches exactly what Label Studio shows in SSO & SAML settings.
- Verify the IdP metadata (URL or XML) is correctly configured in Label Studio.
- Check that the **domain** in Label Studio SAML settings matches the user's email domain.
- Ensure the user is assigned to the Enterprise Application in your IdP.

### User created with wrong role after SSO login

- Verify the `mapping_groups` attribute name matches what your IdP sends (check the SAML assertion).
- For Entra ID: ensure it sends **group names** (not Object IDs) in the groups claim.
- Verify the group name in your IdP exactly matches (case-sensitive) the name in Label Studio SAML settings.
- If using both SAML and SCIM with different role mappings, the last one to run wins.

### Attributes not being extracted from SAML assertion

- Use a SAML debugging tool (e.g. browser extension) to inspect the raw assertion and confirm attribute names.
- Label Studio auto-detects attribute name format (URI vs short name) from metadata, but may not always match. Configure `mapping_email`, `mapping_first_name`, etc. explicitly if auto-detection fails.
- Entra ID full URI attribute names are case-sensitive.

### Email case mismatches

Label Studio normalizes all emails to lowercase for both SAML and SCIM operations. `Alice@Contoso.com` and `alice@contoso.com` are treated as the same user. No special configuration is needed.

### Group name mismatches

Group name matching in SAML settings is **case-sensitive**. `LS-Admins` and `ls-admins` are treated as different groups. Ensure exact casing matches between your IdP group names and Label Studio mapping configurations.


## Advanced SAML configuration

For advanced SAML configuration, the following environment variables control pysaml2 SP behavior:

| Variable | Default | Description |
| --- | --- | --- |
| `SAML_ALLOW_UNSOLICITED` | (pysaml2 default) | Accept IdP-initiated SSO |
| `SAML_AUTHN_REQUESTS_SIGNED` | (pysaml2 default) | Sign authentication requests |
| `SAML_WANT_ASSERTIONS_SIGNED` | (pysaml2 default) | Require signed assertions |
| `SAML_WANT_RESPONSE_SIGNED` | (pysaml2 default) | Require signed responses |
| `SAML_WANT_ASSERTIONS_OR_RESPONSE_SIGNED` | (pysaml2 default) | Require at least one signed |
| `DISABLE_SAML_SSL_VALIDATION` | (not set) | Disable SSL cert validation for metadata fetch |
