---
title: Set up single-sign-on with Label Studio
type: guide
order: 151
meta_title: SSO for Label Studio
meta_description: Label Studio Documentation for creating workspaces and organizations for your data labeling, machine learning, and data science projects.
---

Set up single sign-on using SAML to manage access to Label Studio using your existing Identity Provider (IdP). 

Only Label Studio Enterprise Edition supports SSO. 

The organization owner for Label Studio can set up SSO & SAML for the Label Studio instance. Label Studio Enterprise supports the following IdPs:
- Microsoft Active Directory
- OneLogin
- others that use SAML assertions

## Set up SAML SSO
Set up SAML SSO with Label Studio Enterprise. After you set up SSO, you can no longer use native authentication to access the Label Studio UI unless you have the Owner role. 

## Federate access to data in Label Studio using SAML roles

To further [manage access to data in Label Studio Enterprise](security.html), you can federate access to externally-stored data based on SAML roles. In this way, you can use [roles in Label Studio](manage_users.html) to manage what users can do with the data, and SAML roles to manage what data those users can view within an organization, workspace, or project.

1. Set up identity and access management (IAM) policies with your SAML SSO identity provider (IdP).
2. Restrict bucket access in Amazon S3 or other cloud storage providers based on the SAML-asserted roles.
3. Set up Label Studio Enterprise with the same SAML SSO IdP as the cloud storage provider.
4. When Label Studio Enterprise accesses cloud storage buckets on behalf of users, it uses the SAML-asserted roles to retrieve temporary access tokens that match the user permissions. 

INSERT DIAGRAM HERE


For example, if you federate access to Amazon AWS, that works like the following example:
1. Set up your AWS account to use your IdP.
2. Set up Label Studio Enterprise to use SAML SSO with your IdP. The IdP shares the role entitlements for each user to Label Studio Enterprise.
3. When a user accesses a task stored in Amazon AWS S3 storage, or exports annotations stored in the same, Label Studio Enterprise calls the AWS Security Token Service (STS) with the SAML response from the IdP and is granted a temporary token on behalf of the user.
4. The user gains access to the tasks or annotations automatically and securely. 






