---
title: Install Label Studio Enterprise
badge: <i class='ent'/></i>
type: guide
order: 210
meta_title: Install Label Studio Enterprise
meta_description: Install, back up, and upgrade Label Studio Enterprise to create machine learning and data science projects on-premises.
---

Install Label Studio Enterprise on-premises if you need to meet strong privacy regulations, legal requirements, or want to manage a custom installation on your own infrastructure. You can run Label Studio Enterprise in an airgapped environment, and no data leaves your infrastructure.


This high-level architecture diagram that outlines the main components of a Label Studio Enterprise deployment.

<img src="/images/LSE_k8s_scheme.png"/>

!!! warning
    Label Studio Enterprise 2.2.9 decommissioned MinIO as a service.
    
Label Studio runs on Python and uses rqworkers to perform additional tasks. Metadata and annotations are stored in a bundled version of PostgreSQL that functions as persistent storage. If you host Label Studio in the cloud, use [persistent storage in the cloud](persistent_storage.html) instead of MinIO.

## Before you install

Before you deploy Label Studio Enterprise, prepare your environment. 

1. Set up [persistent storage](persistent_storage.html).
2. For Kubernetes deployments, configure [ingress](ingress_config.html).

## Install Label Studio Enterprise

Select the deployment scenario that best fits your labeling use case. 

| How | Who |
| --- | --- |
| [Install using Docker Compose](install_enterprise_docker.html) | small-scale production data labeling activities with dozens or hundreds of annotators |
| [Install using Kubernetes and Helm charts](install_enterprise_k8s.html) | large-scale production-grade data labeling activities with thousands of annotators |
| [Install Label Studio Enterprise without public internet access](install_enterprise_airgapped.html) | if you use a proxy to access the internet from your Kubernetes cluster, or it is airgapped from the internet |

## More details

- See [Secure Label Studio](security.html) for more details about security and hardening for Label Studio Enterprise. 
- Instead of installing, you can also use [Label Studio Enterprise as a cloud offering](https://heartex.com/product). 

<div class="enterprise"><p>
To install Label Studio Community Edition, see <a href="install.html">Install and Upgrade Label Studio</a>. This page is specific to the Enterprise version of Label Studio.
</p></div>
