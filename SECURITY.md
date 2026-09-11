# Security Policy

## Reporting a vulnerability

Report privately through [GitHub Security Advisories](https://github.com/HumanSignal/label-studio/security/advisories/new).
Please do not open a public issue. Include a proof of concept and the version you tested.

## Supported versions

Reports are assessed against the latest release with default settings. Earlier versions are not supported.

## Security model

Open-source Label Studio is a single-organization, flat-trust application. Two properties define what
is and is not a vulnerability.

**1. One organization per deployment.** Creating organizations over the API is disabled by default
(`ALLOW_ORGANIZATION_CREATION`), and there is no other way to create or join a second one — sign-up
always joins the existing organization. Findings that require two organizations to exist —
"cross-tenant", "cross-organization IDOR", switching `active_organization` — are not vulnerabilities
here. Multi-tenancy is a Label Studio Enterprise feature; report those against Enterprise.

**2. No roles inside the organization.** Every member is equally trusted. There is no role-based
access control in the open-source edition: every permission resolves to "is authenticated", and
`/api/current-user/whoami` returns the full permission set to every user. Anything one member can do,
every member can do — read and write every project, task, annotation, draft, upload and storage
connection, change organization settings and the invitation link, and read and edit every other
member's profile. Per-user filtering in the API is a convenience, not an access control. "Any
authenticated user can access another user's data" is therefore not a vulnerability on its own.

### What is in scope

Reports that cross one of these boundaries:

- **Unauthenticated to authenticated.** Anything reachable without a valid session or token.
- **Application to host and network.** SSRF, reading files outside the configured data roots, command
  execution, or sending credentials to a third-party host.
- **Cross-user code execution.** Stored or reflected XSS, and CSRF — running script in another user's
  browser crosses a boundary regardless of rule 2.
- **Secrets.** Storage credentials, API tokens and passwords must not be readable back through the API.
