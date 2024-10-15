---
title: Installation overview
short: Installation
tier: enterprise
type: guide
order: 0
order_enterprise: 60
meta_title: Installation overview for Label Studio Enterprise
meta_description: Overview of the components involved when installing Label Studio Enterprise as an on-prem deployment
section: "Install & Setup"
---


The two central components of Label Studio Enterprise are the main app and the RQ (Redis Queue) workers. An on-prem deployment typically also includes the following components:

* [**Identity provider**](auth_setup): An external IdP that connects to the main app to send a SAML or SCIM2.0 assertion to Label Studio. Identity providers help you manage user credentials and access. Common IdPs include Okta, Ping, Microsoft Active Directory. 

    While integrating an identity provider is recommended for managing user authentication and access control in a more scalable and secure manner, Label Studio Enterprise can be deployed with its own internal user management system if preferred. 
* [**Load balancer/ingress**](ingress_config): This serves as a traffic manager that directs incoming network requests to the main app.
* [**PostgresSQL database**](install_enterprise_k8s#Optional-set-up-TLS-for-PostgreSQL): This connects with the main app to store annotation metadata. It also connects with the RQ workers to store reports and pre-annotations.
* [**Redis**](install_enterprise_k8s#Optional-set-up-TLS-for-Redis): This works with the main app to perform background tasks such as computing statistical reports and predictions. It also communicates with the RQ workers to manage the background jobs queue. 
* [**Cloud storage**](persistent_storage): Cloud storage works with both the main app and the RQ workers to manage assets and data.
  * Persistent storage for assets such as avatars and snapshots. 
  * Import storage that passes data to Label Studio to be used in labeling tasks. 
  * Export storage for saving the exported annotation data as those tasks are labeled. 
* **Integrations**: For example, these can be a [custom ML backend](ml) that calculates pre-annotations, or any other third-party services that you integrate with Label Studio using [webhooks](webhooks). 


![Diagram of what is included in an on-prem Label Studio Enterprise deployment using Kubernetes](/images/LSE_k8s_scheme.png)


