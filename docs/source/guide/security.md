---
title: Secure Label Studio
type: guide
tier: all
order: 99
order_enterprise: 99
meta_title: Secure Label Studio
meta_description: About the security and hardening processes used by various Label Studio editions, and how you can configure a more secure data labeling project.
section: "Install & Setup"
---

Label Studio provides many ways to secure access to your data and your deployment architecture.

All application component interactions are encrypted using the TLS protocol.

<div class="enterprise-only">

Role-based access control is only available in Label Studio Enterprise.

</div>

<!--If you need to meet strong privacy regulations, legal requirements, or you want to make a custom installation within your infrastructure or any public cloud (AWS, Google, Azure, etc.), Label Studio Enterprise works on-premises. It is a self-contained version (no Internet connection is required) of the Platform, no data will leave your infrastructure. To make the installation the most accessible, we offer a Docker image.-->

Label Studio establishes secure connections to the web application by enforcing HTTPS and secured cookies.

<div class="opensource-only">

If you're running the open source version in production, restrict access to the Label Studio server.
Restrict access to the server itself by opening only the [required ports](/guide/install.html#Port_requirements) on the server.

</div>

## Secure user access to Label Studio

Secure user access to Label Studio to protect data integrity and allow changes to be performed only by those with access to the system.

Each user must create an account with a password of at least 8 characters, allowing you to track who has access to Label Studio and which actions they perform.

<div class="opensource-only">

You can restrict signup to only those with a link to the signup page, and the invitation link to the signup page can be reset. See [Set up user accounts for Label Studio](/guide/signup.html) for more.

</div>

<div class="enterprise-only">

You can restrict signup to only those with a link to the signup page, and the invitation link to the signup page can be reset. See [Set up user accounts for Label Studio](/guide/manage_users.html#Signup) for more.

</div>

<div class="enterprise-only">

If you're using Label Studio Enterprise, you can further secure user access in many ways:

- Assign specific roles to specific user accounts to set up role-based access control. For more about the different roles and permissions in Label Studio Enterprise, see [Manage access to Label Studio](/guide/manage_users.html).
- Set up organizations, workspaces, and projects to separate projects and data across different groups of users. Users in one organization cannot see the workspaces or projects in other organizations. For more about how to use organizations, workspaces, and projects to secure access, see [Organize projects in Label Studio](/guide/manage_users.html#Roles-and-workspaces).

</div>

## Secure API access to Label Studio

Access to the REST API is restricted by user role and requires an access token that is specific to a user account. Access tokens can be reset at any time from the Label Studio UI or using the API.

## Enable SSRF protection for production environments

When deploying Label Studio into a production environment, set the `SSRF_PROTECTION_ENABLED` environment variable to `true`. 

This variable is disabled by default to support users who are working with data in their local environments. However, it should be enabled in production usage. 


## Secure access to data in Label Studio

Data in Label Studio is stored in one or two places, depending on your deployment configuration.

- Project settings and configuration details are stored in Label Studio's internal database.
- Input data (texts, images, audio files) is hosted by external data storage and provided to the Label Studio by using URI links. The data is not stored in Label Studio directly, the content is retrieved client-side only.
- Project annotations are stored in the internal database, and optionally can be stored in a local file directory, a Redis database, or cloud storage buckets on Amazon Web Services (AWS), Google Cloud Platform (GCP), or Microsoft Azure.

### Secure database access

Label Studio does not permit direct access to the internal databases from the app to prevent SQL injection attacks and other data exfiltration attempts.

Instead, the app uses URIs to access the data stored in the database. These URIs can only be accessed by the Label Studio labeling interface and API because the requests to retrieve the data using those URIs are verified and proxied by Basic Authentication headers.

All specific object properties that are exposed with a REST API are added to an allowlist. The API endpoints can only be accessed with specific HTTP verbs and must be accessed by browser-based clients that implement a proper Cross-Origin Resource Sharing (CORS) policy. API tokens are user-specific and can be reset at any time.

The PostgreSQL database has SSL mode enabled and requires valid certificates.

### Secure access to cloud storage

When using Label Studio, users don't have direct access to cloud storage. Objects are retrieved from and stored in cloud storage buckets according to the [cloud storage settings](/guide/storage.html) for each project.

Label Studio accesses the data stored in remote cloud storage using URLs, so place the data in cloud storage buckets near where your team works, rather than near where you host Label Studio.

Use workspaces, projects, and roles to further secure access to cloud storage and data accessed using URLs by setting up cloud storage credentials. You can provide cloud storage authentication credentials globally for all projects in Label Studio, or use different credentials for access to different buckets on a per-project basis. Label Studio allows you to configure different cloud storage buckets for different projects, making it easier to manage access to the data. See [Sync data from external storage](/guide/storage.html).

<div class="enterprise-only">

In Label Studio Enterprise, if you're using Amazon S3, Label Studio can use an IAM role configured with an external ID to access S3 bucket contents securely. See [Set up an S3 connection with IAM role access](/guide/storage.html#Set-up-an-S3-connection-with-IAM-role-access)

</div>


!!! warning Note on securing cloud data
    If you need to secure your data in a way to ensure that it is not touched by Label Studio, see [Source storage Sync and URI resolving](storage#Source-storage-Sync-and-URI-resolving). 

### Secure access to Redis storage

If you use Redis as an external storage database for data and annotations, the setup supports TLS/SSL and requires the Label Studio client to be authenticated to the database with a valid certificate.

<div class="enterprise-only">

## Audit logging

Label Studio Enterprise automatically logs all user activities so that you can monitor the activities being performed in the application.

</div>

## Information collected by Label Studio

Label Studio collects usage statistics including the number of page visits, number of annotations, and data types being used in labeling configurations that you set up. The information we collect helps us improve the experience of labeling data in Label Studio and helps us plan future data types and labeling configurations to support.

<div class="opensource-only">

You can disable data collection by setting the environment variable `COLLECT_ANALYTICS` to `False`. 

</div>

## Add self-signed certificate to trusted root store

<div class="code-tabs">
  <div data-name="Docker Compose">

1. Mount your self-signed certificate as a volume into `app` container:

```yaml
volumes:
  - ./my.cert:/tmp/my.cert:ro
```
2. Add environment variable with the name `CUSTOM_CA_CERTS` mentioning all certificates in comma-separated way that should be added into trust store:

```yaml
CUSTOM_CA_CERTS=/tmp/my.cert
```
  </div>

  <div data-name="Kubernetes">

1. Upload your self-signed certificate as a k8s secret.
   Upload `my.cert` as a secrets with a name `test-my-root-cert`:
   
```yaml
kubectl create secret generic test-my-root-cert --from-file=file=my.cert
```

2. Add volumes into your values.yaml file and mention them in `.global.customCaCerts`:

```yaml
global:
  customCaCerts:
   - /opt/heartex/secrets/ca_certs/file/file

app:
  extraVolumes:
    - name: foo
      secret:
        secretName: test-my-root-cert
  extraVolumeMounts:
    - name: foo
      mountPath: "/opt/heartex/secrets/ca_certs/file"
      readOnly: true

rqworker:
  extraVolumes:
    - name: foo
      secret:
        secretName: test-my-root-cert
  extraVolumeMounts:
    - name: foo
      mountPath: "/opt/heartex/secrets/ca_certs/file"
      readOnly: true
```
  </div>
</div>


### Add self-signed certificate to trusted root store for S3 storage

Boto library is used to connect to cloud storage S3. `AWS_CA_BUNDLE` has to be set as environment variable.
<div class="code-tabs">
  <div data-name="Docker Compose">

1. Mount your self-signed certificate as a volume into `app` container: (has to be .pem file type)

```yaml
volumes:
  - ./ca.pem:/tmp/ca.pem:ro
```
2. Add environment variable with the name `AWS_CA_BUNDLE` to be trusted by boto library.

```yaml
AWS_CA_BUNDLE=/tmp/ca.pem
```
