---
title: Set up SCIM2 for Label Studio
short: SCIM2
tier: enterprise
type: guide
order: 0
order_enterprise: 389
meta_title: System for Cross-domain Identity Management (SCIM) for Label Studio Enterprise
meta_description: Label Studio Enterprise documentation for setting up SCIM2
section: "Manage Your Organization"
parent: "admin_auth"
parent_enterprise: "admin_auth"
---

System for Cross-domain Identity Management (SCIM) is a popular protocol to manage access for services and applications across an organization. 

Using a SCIM provider, you can manage access to Label Studio Enterprise workspaces, and grant roles to individual users and groups.

## Requirements

Label Studio Enterprise uses the SCIM Version 2.0 standard. 

Label Studio Enterprise follows [SCIM RFC 5741](https://datatracker.ietf.org/doc/html/rfc7644#section-3.2) and can be integrated with any access management services that support the standard.

For more information on SCIM workflows, see [How SCIM works with Label Studio Enterprise](scim_workflow). 

## Prerequisites

* SCIM interacts with your SSO integration. Before you begin, you must have SSO already configured. If you do not have SSO set up yet, then follow [Set up SSO](auth_setup.html).

!!! note
    Okta or similar SSO providers have SCIM integration based on SSO.

* You will need a Label Studio API token from the organization owner. Both [Legacy tokens](access_tokens#Legacy-tokens) and JWT-based Personal Access Tokens (PATs) are supported.

## Set up SCIM (general steps)

The following steps apply to any SCIM 2.0-compatible identity provider. For IdP-specific walkthroughs, see [IdP-specific setup guides](#IdP-specific-setup-guides).

### Step 1: Add Label Studio as an application in your IdP

If you have not already created an application for Label Studio as part of your SSO setup, create one now in your IdP. SCIM provisioning is typically configured on the same application used for SSO (SAML 2.0).

### Step 2: Enable SCIM provisioning

In your IdP's application settings, enable SCIM (or "automatic") provisioning and configure the connection:

| Setting | Value |
|---------|-------|
| **SCIM connector base URL** | `https://<your-label-studio-host>/scim/v2/` |
| **Authorization** | `Bearer <token>`, where the token is a Label Studio API token from the organization owner. Both [Legacy tokens](access_tokens#Legacy-tokens) and JWT-based Personal Access Tokens (PATs) are supported. |
| **Unique identifier field for users** | `email` |

After entering these values, use your IdP's **Test Connection** feature (if available) to verify that Label Studio is reachable and the token is valid.

### Step 3: Configure user attribute mappings

Map your IdP's user attributes to SCIM target attributes. The following attributes are supported by Label Studio:

| SCIM Target Attribute | Required | Notes |
|-----------------------|----------|-------|
| `userName` | **Yes** | Must be a valid email address. Label Studio uses this as the user's login identifier and email. |
| `active` | **Yes** | Controls user activation and deactivation. When set to `false`, the user's role becomes **Deactivated**. |
| `name.givenName` | No | First name, displayed in the Label Studio UI. |
| `name.familyName` | No | Last name, displayed in the Label Studio UI. |

!!! warning "Remove unsupported attribute mappings"
    Many IdPs include default mappings for attributes that Label Studio does not support (e.g. phone numbers, addresses, enterprise extension attributes). Remove any mappings that are not listed above. Unsupported attributes will result in **HTTP 501** errors during provisioning.

### Step 4: Enable provisioning actions

Enable the following provisioning actions in your IdP (the exact labels vary by provider):

- Create users
- Update user attributes
- Deactivate users

### Step 5: Configure group provisioning

If you plan to use groups to manage roles, workspace membership, and project access, enable group provisioning in your IdP. The required group attributes are:

| SCIM Target Attribute | Required | Notes |
|-----------------------|----------|-------|
| `displayName` | **Yes** | The group name. This must **exactly match** (case-sensitive) the group names configured in Label Studio's SCIM settings. |
| `members` | **Yes** | The list of group members. |

### Step 6: Configure group mappings in Label Studio

In Label Studio, go to **Organization > Security > SSO & SCIM** to map your IdP groups to roles, workspaces, and projects:

* **Organization Roles to Groups Mapping** -- Map groups to organization-level roles (Administrator, Manager, Reviewer, or Annotator). The most elevated role wins if a user belongs to multiple groups. For more information on roles, see [Roles in Label Studio Enterprise](admin_roles).
* **Workspaces to Groups Mapping** -- Add groups as members to workspaces. Users with Manager, Reviewer, or Annotator roles can only access workspaces they have been added to.
* **Projects to Groups Mapping** -- Map groups to project-level roles (Annotator, Reviewer, or Inherit). A group can have different roles across different projects.

You can also configure these mappings via the API. For details, see [Group mapping reference](#Group-mapping-reference).

### Step 7: Assign users and groups to the application

In your IdP, assign the users and/or groups that should be provisioned to the Label Studio application. Only assigned users and groups are synced.

### Step 8: Start provisioning

Trigger an initial sync from your IdP. Depending on the provider, the first sync cycle may take longer than subsequent incremental syncs. Monitor your IdP's provisioning logs for errors.

After provisioning completes, verify in Label Studio that users appear with the expected roles and group memberships.






## Group mapping reference

Both SAML and SCIM use the same group mapping format and the same underlying mapping logic. The mapping types are configured independently for each protocol (SAML settings and SCIM settings are separate), but the behavior is identical.

### Organization role mapping (`roles_groups`)

Maps a group from your IdP to an organization-level role.

**Format:** `["<RoleName>", "<GroupName>"]`

**Available roles:**

| Role Name | Description |
| --- | --- |
| `Administrator` | Full organization admin access |
| `Manager` | Can manage projects and members |
| `Reviewer` | Can review annotations |
| `Annotator` | Can annotate tasks |

!!! note
    `Owner` cannot be assigned via SAML or SCIM---it is explicitly excluded from group mappings. `Not Activated` and `Deactivated` are internal system states managed automatically and should not be used in `roles_groups` mappings.

**Behavior when a user is in multiple role groups:** The most elevated role wins. For example, if a user is in both an Annotator group and a Manager group, they get the Manager role.

**Behavior when a user is removed from all role groups:** Their role is set to Deactivated (subject to the `manual_role_management` flag).

### Workspace mapping (`workspaces_groups`)

Maps a group from your IdP to a Label Studio workspace.

**Format:** `["<WorkspaceTitle>", "<GroupName>"]`

- Workspaces are **automatically created** when a SCIM group push or SAML login triggers the mapping. However, the `/api/scim/settings` endpoint validates that referenced workspaces already exist---create them first, or use the UI to save settings.
- A user can be mapped to multiple workspaces through multiple group memberships.
- **SCIM:** removal respects the `manual_workspace_management` billing flag---if enabled, users are not automatically removed from workspaces when they leave a group.
- **SAML:** workspace sync behavior is controlled by the `MANUAL_WORKSPACE_MANAGEMENT` environment variable (default: `True`). When `False`, all SAML-mapped workspaces are reset and re-applied on each login.

### Project role mapping (`projects_groups`)

Maps a group from your IdP to membership in a specific project, with a project-level role.

**Format:** `{"project_id": <id>, "group": "<GroupName>", "role": "<Role>"}`

**Available project roles:**

| Role | Description |
| --- | --- |
| `Inherit` | User gets project access but inherits their organization role (no explicit project role assigned) |
| `Annotator` | Explicit annotator role on the project |
| `Reviewer` | Explicit reviewer role on the project |

- `project_id` must be an existing project in your organization.
- The most elevated role wins when a user is in multiple groups mapped to the same project.
- Removal respects the `manual_project_member_management` billing flag.
- **When SCIM project group assignments exist for a user, SAML project sync is skipped** for that user to avoid conflicts.


## SCIM user lifecycle

| Event | What happens in Label Studio |
| --- | --- |
| **User provisioned** | Account created with the organization's default role (configured in Organization settings). Role is then updated when group sync runs. |
| **User already exists in another org** | User is added to this organization with the default role. Profile fields (name, etc.) are **not** overwritten---only the org membership is created. |
| **User added to a role group** | Role upgraded to the mapped role (or highest if in multiple groups). |
| **User removed from a role group** | Role falls back to the next-highest mapped role, or Deactivated if no role groups remain (subject to `manual_role_management`). |
| **User deactivated in Entra ID / Okta** | `active` set to `false` → role becomes Deactivated. |
| **User reactivated in Entra ID / Okta** | `active` set to `true` → role restored from SCIM group mappings, or the organization's default role if no mappings exist. |
| **User deleted in Entra ID / Okta** | Soft-deleted in Label Studio (deactivated, not removed). |


## SAML and SCIM interaction

If your organization uses both SAML SSO and SCIM provisioning, be aware of the following interactions:

- **Group mappings are configured separately.** SAML settings (`/api/saml/settings`) and SCIM settings (`/api/scim/settings`) each have their own `roles_groups`, `workspaces_groups`, and `projects_groups`. You can configure identical mappings in both, or use different mappings for each protocol.
- **SCIM project mappings take precedence over SAML.** When SCIM-driven project group assignments exist for a user, SAML skips its project role sync for that user entirely, to avoid conflicts.
- **Deleting SAML settings clears SCIM group assignments.** Using `DELETE /api/saml/settings` wipes all group assignment records and resets SCIM group settings for the organization. If you need to reconfigure SAML, re-save your SCIM settings afterward and wait for the next group sync to rebuild assignments.
- **`manual_role_management` is shared.** The per-org override in SAML settings takes precedence over the billing/environment default for both SAML and SCIM role removal behavior.
- **SSO login can still change roles even with SCIM.** If a user authenticates via SAML and SAML role mappings are configured, the role may be re-evaluated on login based on SAML group attributes---potentially overriding a role set by SCIM. To avoid this, either use the same mappings in both, or configure role mappings in only one of the two.

For more information on SAML SSO setup, see [Set up SSO authentication for Label Studio](auth_setup.html).

## IdP-specific setup guides

This section contains IdP-specific setup guides for SCIM.

{% details <b>Okta</b> %}

!!! warning "Important"
    This video demonstrates the use of `userName` in the 'Unique Identifier Field for Users' field. It is essential to use `email` as the unique identifier instead of `userName`; otherwise, SCIM will not function correctly with users who were created prior to the SCIM integration.

<iframe width="560" height="315" src="https://www.youtube.com/embed/MA3de3gu18A" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

To manage access to Label Studio Enterprise, add the application to your SCIM provider (Okta). 

Okta uses a Bearer (request header should be `Authorization: Bearer <token>`) token to interact with REST API endpoints of the application to provision and deprovision access.

#### Step 1: Add Label Studio Enterprise as an application (if not complete)

1. Navigate to **Applications > Applications** in Okta. Click  **Create App Integration**. 
2. Select **SAML 2.0**. Enter an app name (for example, _Label Studio Enterprise_).
3. Under **Configure SAML**, set up the SAML integration following the steps outlined in [Set up SSO guide](auth_setup.html).
4. Make sure Label Studio Enterprise appears in the list of active applications.

#### Step 2: Enable SCIM provisioning

1. Navigate to **Applications > Applications** in Okta. 
2. Select **Label Studio Enterprise**.
3. Select the **General** tab and select **Enable SCIM provisioning**.
4. Select the **Provisioning** tab. 
5. Select **Integration** in the left menu. 
6. Click **Edit** in the right corner.

Complete the following fields:

| Field | Value/Description |
|-------|-------------------|
| **SCIM connector base URL** | `https://<LABEL_STUDIO_BASE_URL>/scim/v2/` where `<LABEL_STUDIO_BASE_URL>` is the base URL of your Label Studio Enterprise instance. |
| **Unique identifier field for users** | Use `email`. Label Studio Enterprise uses email as user identifier in this field. |
| **Supported provisioning actions** | Select the following items:<br>- Import New Users and Profile Updates<br>- Push New Users<br>- Push Profile Updates<br>- Push Groups |
| **HTTP Header → `Authorization: Bearer <token>`** | Enter the [Legacy token](access_tokens#Legacy-tokens) associated with the Owner account in Label Studio. <br />For Label Studio, `Token` and `Bearer` are the same tokens. However, it's important to use `Bearer` instead of `Token` in the request header. | 

#### Step 3: SCIM settings and application triggers

1. On the application page navigate to **Provisioning** tab and select **To App** in the left menu. Click **Edit** in the right corner.
2. Enable the following items:
   - Create Users
   - Update User Attributes
   - Deactivate Users

#### Step 4: Assign the application to a single user

You can assign the application on both the **user** page and **application** page.

1. On the **application** page navigate to **Assignments** tab.
2. Click **Assign** and select **Assign to People**.
3. Select the people you would like to be added to Label Studio Enterprise.
4. Click **Done**.

After you click **Done**, Okta will send the requests to create users accordingly in the Label Studio Enterprise.

#### Step 5: Unassigning the application for users

1. On the application page navigate to **Assignments** tab.
2. Select **People** in the left menu.
3. Click the delete cross against the user you would like to unassign.
4. Confirm the unassignment.

#### Step 6: Assign the application to a group

The most convenient way to manage access to the application is via groups. You can assign Label Studio to groups and manage the groups in Okta. The changes will be propagated to the application.

#### Step 7: Set up group mapping in Label Studio

In Label Studio, go to **Organization > Security > SSO & SCIM** to set up group mapping. 

Here you can update roles and workspaces mapping. Ensure the group name you enter is the same as the group name being sent by your SCIM provider. For more information on group mapping, see [Group mapping reference](#Group-mapping-reference).

* **Organization Roles to Groups Mapping**---Map groups to roles at the organization level. The role set at the organization level is the default role of the user and is automatically assigned to workspaces and projects. For more information on roles, see [Roles in Label Studio Enterprise](admin_roles). 

  You can map multiple groups to the same role. Note that users who are **Not Activated** or **Deactivated** do not count towards the seat limit for your account. 
* **Workspaces to Groups Mapping**---Add groups as members to workspaces. Users with Manager, Reviewer, or Annotator roles can only see workspaces after they've been added as a member to that workspace.
    
  Select an existing workspace or create a new one. You can map multiple groups to the same workspace.  
* **Projects to Groups Mapping**---Map groups to roles at the project level. Project-level roles can be **Annotator**, **Reviewer**, or **Inherit**. 
    
  You can map a group to different roles across multiple projects. You can also map multiple groups to the same roles and the same projects. For more information on roles, see [Roles in Label Studio Enterprise](admin_roles). 
    
  If you select **Inherit**, the group will inherit the role set above under **Organization Roles to Groups Mapping.** If the group is inheriting the Not Activated role, the users are mapped to the project, but they are not actually assigned to the project until the group is synced (meaning that the user authenticates first). 

#### Step 8: Assign a group to the application

1. Using Okta, navigate to the **application** page and open the **Assignments** tab. 
2. Select **Assign > Assign** to Groups and choose the group. 
3. Set attribute **Active to true**. 

After saving the group assignment, the update will be queued and sent to Label Studio. 

!!! note
    Alternatively, you can push the changes immediately to Label Studio.

#### Step 9: Sync groups to the application

1. Using Okta, navigate to the **application** page and open the **Push Groups** tab. 
2. Click **Push Groups** and select **Find groups by name**. 
3. Find the group you would like to sync to Label Studio. 
4. Choose either **Create Group** or **Link Group**, if you already have a workplace with the same name as specified on the **SCIM** >> **Settings** page.

#### Unassigning the application for groups

To unassign a group from the application:

1. On the **application** page, navigate to the **Assignments** tab.
2. Select **Group** in the left menu.
3. Click the delete cross against the group you would like to unassign.
4. Confirm the unassignment.


<i>Check this video tutorial to remove a user and group.</i>
<iframe width="560" height="315" src="https://www.youtube.com/embed/vMA0TLhHGYE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

{% enddetails %}

{% details <b>Microsoft Entra ID (formerly Azure AD)</b> %}

Label Studio Enterprise supports SCIM provisioning with Microsoft Entra ID (formerly Azure AD). You can use the same Enterprise Application created for SAML SSO, or create a separate one for SCIM provisioning. Using the same application is simpler when you want both SSO and provisioning.

#### Step 1: Create or reuse the Enterprise Application

If creating a new application specifically for SCIM:

1. In the Azure Portal, go to **Entra ID > Enterprise Applications > New Application**.
2. Select **Create your own application** > **Integrate any other application not found in the gallery**.
3. Name it (e.g. `Label Studio SCIM`) and create it.

#### Step 2: Enable provisioning

1. Open your Enterprise Application and select **Provisioning > Get started**.
2. Set **Provisioning Mode** to **Automatic**.
3. Under **Admin Credentials**:
    - **Tenant URL**: `https://<your-label-studio-host>/scim/v2` (both `/scim/v2` and `/scim/` are accepted)
    - **Secret Token**: A Label Studio API token from the organization owner (legacy token or PAT)
4. Click **Test Connection** to verify connectivity.
5. Click **Save**.

#### Step 3: Configure user attribute mappings

Go to **Provisioning > Mappings > Provision Microsoft Entra ID Users**.

##### Required mappings

| Entra ID Attribute | SCIM Target Attribute | Required | Notes |
| --- | --- | --- | --- |
| `userPrincipalName` | `userName` | **Yes** | Must be a valid email address. Label Studio uses this as the user's email and login identifier. If your UPNs are not email addresses, map `mail` instead. |
| `Switch([IsSoftDeleted], , "False", "True", "True", "False")` | `active` | **Yes** | Controls user activation/deactivation. When set to `false`, the user's org role becomes **Deactivated**. |

##### Recommended mappings

| Entra ID Attribute | SCIM Target Attribute | Required | Notes |
| --- | --- | --- | --- |
| `givenName` | `name.givenName` | No | First name, displayed in the Label Studio UI. |
| `surname` | `name.familyName` | No | Last name, displayed in the Label Studio UI. |

##### Optional mappings (no effect)

These attributes are accepted by the SCIM endpoint but have no functional impact in Label Studio:

| Entra ID Attribute | SCIM Target Attribute | Notes |
| --- | --- | --- |
| `objectId` | `externalId` | Ignored on write---Label Studio always returns the user's email as `externalId` regardless of the inbound value. |
| `displayName` | `displayName` | Read-only in Label Studio; always derived from `first_name + last_name`. |
| `preferredLanguage` | `locale` | Ignored; always returns `en-US`. |

##### Mappings to remove

!!! warning "Unsupported attributes cause provisioning errors"
    Remove any default Entra ID mappings that target attributes not supported by Label Studio's SCIM endpoint. Leaving unsupported mappings in place will result in **HTTP 501 (Not Implemented)** errors during provisioning. Common mappings to remove:
    
    * `mailNickname`
    * `facsimileTelephoneNumber`
    * `mobile`
    * `physicalDeliveryOfficeName`
    * `streetAddress`, `state`, `postalCode`, `country`
    * `name.formatted`
    * Any `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:*` attributes

!!! note
    Entra ID typically does **not** send the `emails` array in its SCIM payloads. Label Studio derives the email from `userName` when `emails` is absent, as long as `userName` is a valid email address. If your tenant's UPNs are not email addresses (e.g. `jsmith@contoso.local`), map `mail` to `userName` instead.

#### Step 4: Configure group provisioning

Go to **Provisioning > Mappings > Provision Microsoft Entra ID Groups**.

##### Required group mappings

| Entra ID Attribute | SCIM Target Attribute | Required | Notes |
| --- | --- | --- | --- |
| `displayName` | `displayName` | **Yes** | The group name. This value must **exactly match** (case-sensitive) the group names configured in Label Studio's SCIM settings. |
| `members` | `members` | **Yes** | The list of group members. Entra ID sends member additions/removals as PATCH operations. |

##### Assigning groups to the application

Only groups that are **assigned to the Enterprise Application** in Entra ID will be provisioned:

1. Go to **Enterprise Application > Users and groups > Add user/group**.
2. Select the security groups you want to provision.
3. Click **Assign**.

The `displayName` of each assigned group is what Label Studio uses to match against its mapping rules.

#### Step 5: Configure SCIM group mappings in Label Studio

This is where you tell Label Studio what each Entra ID group **means**---which role, workspace, or project access it grants.

Configure mappings via the API:

```bash
curl -X POST "https://<your-label-studio-host>/api/scim/settings" \
  -H "Authorization: Token <owner-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "roles_groups": [
      ["Administrator", "LS-Admins"],
      ["Manager", "LS-Managers"],
      ["Reviewer", "LS-Reviewers"],
      ["Annotator", "LS-Annotators"]
    ],
    "workspaces_groups": [
      ["Engineering", "LS-Engineering-Team"],
      ["QA", "LS-QA-Team"]
    ],
    "projects_groups": [
      {"project_id": 42, "group": "LS-Project42-Annotators", "role": "Annotator"},
      {"project_id": 42, "group": "LS-Project42-Reviewers", "role": "Reviewer"},
      {"project_id": 99, "group": "LS-AllProjects", "role": "Inherit"}
    ]
  }'
```

Or configure them in the Label Studio UI under **Organization > SCIM Settings**.

For detailed information on the mapping format and behavior, see [Group mapping reference](#group-mapping-reference) below.

#### Step 6: Start provisioning

1. Go to **Provisioning > Overview**.
2. Click **Start provisioning**.
3. Entra ID will perform an initial sync cycle (can take 20--40 minutes for the first cycle).
4. Subsequent incremental syncs run approximately every 40 minutes.

You can trigger an on-demand sync from the **Provision on demand** option for individual users.

{% enddetails %}

## Troubleshooting SCIM

##### Provisioning test connection fails

- Verify the SCIM endpoint URL ends with `/scim/v2` (or `/scim/`).
- Verify the bearer token belongs to the **organization owner** (SCIM API requires owner-level authentication). Both legacy API tokens and PATs are accepted.
- Check that the Label Studio instance is reachable from the internet (or via your network configuration).

##### User created but has wrong role

1. Verify the user is assigned to the correct group in your IdP.
2. Verify the group is assigned to the Enterprise Application (in Entra ID) or pushed to the application (in Okta).
3. Verify the group `displayName` in your IdP exactly matches (case-sensitive) the name in Label Studio SCIM settings.
4. Ensure a provisioning cycle has completed after the group assignment (or trigger on-demand provisioning).

##### Users not appearing in workspaces or projects

- Group provisioning must be enabled in the attribute mappings.
- The group must be **assigned** to the Enterprise Application (just existing in Entra ID is not enough).
- SCIM group settings in Label Studio must be configured **before** or **at the same time as** the groups are pushed. If settings are configured after groups were already synced, save the SCIM settings again to trigger re-evaluation.

##### Unsupported attribute errors in provisioning logs

Remove any default IdP attribute mappings that target attributes not in the Label Studio SCIM schema. See the [Mappings to remove](#mappings-to-remove) section above for common attributes to remove.

##### Email case mismatches

Label Studio normalizes all emails to lowercase for both SAML and SCIM operations. `Alice@Contoso.com` and `alice@contoso.com` are treated as the same user. No special configuration is needed.

##### Group name mismatches

Group name matching in SCIM settings is **case-sensitive**. `LS-Admins` and `ls-admins` are treated as different groups. Ensure exact casing matches between your IdP group names and Label Studio mapping configurations.
