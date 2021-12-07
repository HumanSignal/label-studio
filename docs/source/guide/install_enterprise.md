---
title: Install Label Studio Enterprise
badge: <i class='ent'/></i>
type: guide
order: 201
meta_title: Install Label Studio Enterprise
meta_description: Install, back up, and upgrade Label Studio Enterprise to create machine learning and data science projects on-premises.
---

Install Label Studio Enterprise on-premises if you need to meet strong privacy regulations, legal requirements, or want to manage a custom installation on your own infrastructure. You can run Label Studio Enterprise in an airgapped environment, and no data leaves your infrastructure.

Before you install, you can review this high-level architecture diagram that outlines the main components of Label Studio Enterprise in an on-premises deployment.

<Insert a diagram and informative text about the diagram>

Label Studio runs on Python and uses rqworkers to perform additional tasks. Metadata and annotations are stored in a bundled version of PostgreSQL that functions as persistent storage. 


## Install Label Studio Enterprise
You can install Label Studio Enterprise using Docker Compose or using Kubernetes and Helm. 

* [Install using Docker Compose](install_enterprise_docker.html) for small-scale production data labeling activities with dozens or hundreds of annotators. 
* [Install using Kubernetes and Helm charts](install_enterprise_k8s.html) for large-scale production-grade data labeling activities with tens of thousands of annotators.
* [Install Label Studio Enterprise without public internet access](install_enterprise_airgapped.html) if you use a proxy to access the internet from your Kubernetes cluster, or it is airgapped from the internet.









See [Secure Label Studio](security.html) for more details about security and hardening for Label Studio Enterprise.

You can also use [Label Studio Teams as a SaaS solution or Label Studio Enterprise as a cloud offering](https://heartex.com/product). 

<div class="enterprise"><p>
To install Label Studio Community Edition, see <a href="install.html">Install and Upgrade Label Studio</a>. This page is specific to the Enterprise version of Label Studio.
</p></div>