---
title: Label Studio Security
type: guide
order: 110
meta_title: Label Studio Security
meta_description: Label Studio Documentation about the security, privacy, hardening, and access control functionality in Label Studio. 
---
Label Studio provides many ways to secure access to your data and your deployment architecture. 

The following security-related functionality is only available in Label Studio Enterprise deployments:
* Role-based access control
* Single sign-on and SAML support
* 

If you're running the open source version in production, restrict access to the Label Studio server and data storage. 

how highly confidential data is handled, easiness/flexibility in configuring annotation UIs, ways to improve label accuracy and collaboration among data scientist/labelers, etc.



## Secure user access to Label Studio

Secure user access to Label Studio to protect data integrity and allow changes to be performed only by those with access to the system. 

Each user must create an account with a password of at least 8 characters, allowing you to track who has access to Label Studio and which actions they perform. 

You can restrict signup to only those with a link to the signup page, and the invitation link to the signup page can be reset. See [Set up user accounts for Label Studio](signup.html) for more. 

If you're using Label Studio Enterprise, you can further secure user access in many ways:
- Assign specific roles to specific user accounts to set up role-based access control. For more about the different roles and permissions in Label Studio Enterprise, see [Manage access to Label Studio](manageusers.html). 
- Set up organizations, workspaces, and projects to separate projects and data across different groups of users. Users in one organization cannot see the workspaces or projects in other organizations. For more about how to use organizations, workspaces, and projects to secure access, see [Manage access to Label Studio](manageusers.html). 
-

someone can provide multiple roles in their SAML attributes, and those roles could be used to restrict access to different S3 buckets for our internal Heartex roles (annotators and admins) by specifying RoleArn.


Is it either/or with SSO and native authn? 

to authenticate to the REST API, use the access token for your user account in the LSE UI.




## Secure access to data in Label Studio

Data in Label Studio is stored in one or two places, depending on your deployment configuration.

Project settings and configuration details are stored in a SQLite or PostgreSQL database. 
Project data and annotations can be stored in a SQLite or PostgreSQL database, or stored in a local file directory, a Redis database, or cloud storage buckets on Amazon Web Services (AWS), Google Cloud Platform (GCP), or Microsoft Azure. 

TLS protocol is supported in between all application components.


### Secure database access
Label Studio does not permit direct access to the SQLite or PostgreSQL databases from the app. 

The app enables restricted access to the data URI stored in a database. The data access requests are verified and proxied with BasicAuth headers to the specified endpoints. This prevents from URI being accessed elsewhere by unauthorized user besides specific project labeling interface / API. Users cannot access the database directly. 


All specific object properties that are exposed with a REST API are added to an allowlist. The API endpoints can only be accessed with specific HTTP verbs and must be accessed by browser-based clients that implement a proper Cross-Origin Resource Sharing (CORS) policy. API tokens are user-specific and can be reset at any time.

### Secure access to cloud storage

When using Label Studio, users don't have direct access to cloud storage. Objects are retrieved from and stored in cloud storage buckets according to the [cloud storage settings](storage.html) for each project. 

The best way to secure access to cloud storage is to federate access with SAML:
1. Set up identity and access management (IAM) policies with your SAML SSO identity provider (IdP).
2. Restrict bucket access in Amazon S3 or other cloud storage providers based on the SAML-asserted roles.
3. Set up Label Studio Enterprise with the same SAML SSO IdP as the cloud storage provider.
4. When Label Studio Enterprise accesses cloud storage buckets on behalf of users, it uses the SAML-asserted roles to retrieve temporary access tokens that match the user permissions. 







Users don't have direct access to AWS. Instead, the following process is used:
1. Set up your AWS account to use your IdP.
2. Set up Label Studio Enterprise to use SAML SSO with your IdP. The IdP shares the role entitlements for each user to Label Studio Enterprise.
3. When a user accesses a task stored in Amazon AWS S3 storage, or exports annotations stored in the same, Label Studio Enterprise calls the AWS Security Token Service (STS) with the SAML response from the IdP and is granted a temporary token on behalf of the user.
4. The user gains access to the tasks or annotations automatically and securely. 
   



Cloud storage authentication credentials could be provided globally for the on-prem environment, as well as specifically per project by an authorized user.


Label Studio accesses the data stored in remote cloud storage via URLs, so keep the cloud storage buckets near where your team works rather than near where the label studio install is hosted. 

Using SAML-based federation to restrict access to S3 buckets, if you're using S3 buckets to store the data.

In your organization's IdP, you define assertions that map users or groups in your organization to the IAM roles. Note that different users and groups in your organization might map to different IAM roles.



## Secure your Label Studio deployment


Establishing secure connection by enforcing HTTPS protocol, including secured cookies.

PostgreSQL
SSL mode is enabled with certificates required

Redis
TLS/SSL is supported and requires client to be authenticated with a valid certificate.

## Audit logging
Label Studio Enterprise automatically logs all user activities so that you can monitor the activities being performed in the application.

//

Is it offered as a SaaS or a software package that we install? --> both

Understanding overall architecture and various components – compute, storage, network

How is data security implemented? At rest and in motion between various components?