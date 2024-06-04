---
title: Install Label Studio without public internet access
short: Airgapped Server
tier: all
type: guide
order: 71
order_enterprise: 71
meta_title: Install Label Studio without public internet access
meta_description: Install Label Studio without public internet access to create machine learning and data science projects in an airgapped environment. 
section: "Install & Setup"
parent: "install_k8s"
parent_enterprise: "install_enterprise_k8s"
---

If you need to install Label Studio on a server that blocks access to the internet using a proxy, or an airgapped server that does not allow outgoing connections to the internet, follow these steps:

- If you access the internet from your server using an HTTPS proxy, see [Install behind an HTTPS proxy](#Install-behind-an-HTTPS-proxy).
- If you do not have access to the internet from your server, or use a different proxy, see [Install without internet access or HTTPS proxy](#Install-without-internet-access-or-HTTPS-proxy).

### Install behind an HTTPS proxy

!!! note 
    If you are using a SOCKS proxy, Helm 3 does not support SOCKS proxies. See [Install without internet access or HTTPS proxy](#Install-without-internet-access-or-HTTPS-proxy).

If your organization uses an HTTPS proxy to manage access to the internet, do the following.

1. Work with your network security team to whitelist `https://charts.heartex.com` so that you can access the Helm charts for deployment.
2. On the Label Studio server, set an environment variable with the HTTPS proxy address:
```shell
export HTTPS_PROXY=<your_proxy>
```
3. [Use Helm to install Label Studio on your Kubernetes cluster](install_k8s.html#Use-Helm-to-install-Label-Studio-Enterprise-on-your-Kubernetes-cluster).

### Install without internet access or HTTPS proxy

If you can't access the internet using a proxy supported by Helm or at all, follow these steps to download the Helm charts necessary to deploy Label Studio on an airgapped Kubernetes cluster. 

!!! note
    You need the Label Studio credentials provided to you by your account manager to download the Helm charts.

1. Download the latest version of Label Studio Helm chart:
   ```shell
   helm repo add heartex https://charts.heartex.com/
   helm repo update heartex
   helm pull heartex/label-studio
   ```
2. Transfer the downloaded `tar.gz` archive to the host that has `kubectl` and `helm` installed.
3. Expand the `tar.gz` archive.
4. Install Label Studio, updating the path in the `helm` commands to reference the relative path of the folder where you expanded Label Studio Helm cahrt. For example, if you expanded the archive file in the current directory, run the following:
```shell
helm install ls ./label-studio -f ls-values.yaml
```