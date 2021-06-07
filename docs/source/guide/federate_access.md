---
title: <img src="/images/LSE/en.svg" width=67 height=18 alt="Enterprise" style="vertical-align:middle"/> Federate access to data in Label Studio using SAML roles
type: guide
order: 222
meta_title: Federate data access in Label Studio with SAML
meta_description: Label Studio Documentation for federating access to cloud storage using SAML roles to secure your machine learning and data science projects. 
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

To further [manage access to data in Label Studio Enterprise](security.html), you can federate access to externally-stored data based on SAML roles. In this way, you can use [roles in Label Studio](manage_users.html) to manage what users can do with the data, and SAML roles to manage what data those users can view within an organization, workspace, or project.

<div class="enterprise"><p>
Federating access to data is only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

## Prerequisites

You must be using Label Studio Enterprise Edition and have [set up SSO](auth_setup.html) to federate access with SAML.

## Set up federated access using SAML

1. Set up identity and access management (IAM) policies with your SAML SSO identity provider (IdP).
2. Restrict bucket access in Amazon S3 or other cloud storage providers based on the SAML-asserted roles.
3. Set up Label Studio Enterprise with the same SAML SSO IdP as the cloud storage provider.
4. When Label Studio Enterprise accesses cloud storage buckets on behalf of users, it uses the SAML-asserted roles to retrieve temporary access tokens that match the user permissions.

<img src="/images/LSE/LSE-federated-access-diagram.png" alt="Diagram showing Label Studio federated access, duplicated in the following example steps."/>

For example, if you use an AWS Virtual Private Cloud (VPC) to host Label Studio, the following happens when a user accesses a task stored in AWS S3:
1. The user makes a client authentication request to the SAML IdP when they log in to Label Studio.
2. The SAML IdP returns a SAML assertion to the Label Studio application.
3. Label Studio calls the [`AssumeRoleWithSAML` endpoint](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithSAML.html) of the Amazon AWS Security Token Service (STS) with the `RoleArn`, `PrincipalArn`, and base64 SAML assertion string from the IdP.
4. AWS STS returns temporary security credentials to Label Studio on behalf of the user. 
5. Label Studio uses the temporary security credentials to get federated access to the S3 data, based on the assumed role from the user. 
6. Label Studio creates presigned URLs for the data in the S3 buckets and displays the requested tasks to the user using those URLs. 
