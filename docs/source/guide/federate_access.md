---
title:  Federate access to data in Label Studio using SAML roles
type: guide
order: 222
meta_title: Federate data access with SAML
meta_description: Label Studio Documentation for federating access to cloud storage using SAML roles to secure your machine learning and data science projects. 
---

To further [manage access to data in Label Studio Enterprise](security.html), you can federate access to externally-stored data based on SAML roles. In this way, you can use [roles in Label Studio](manage_users.html) to manage what users can do with the data, and SAML roles to manage what data those users can view within an organization, workspace, or project.

You must be using Label Studio Enterprise Edition and have [set up SSO](SSO_setup.html) to federate access with SAML.

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