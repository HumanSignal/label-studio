---
title: Set up an ingress controller for Label Studio Kubernetes deployments
short: Set up an ingress controller
type: guide
tier: all
order: 70
order_enterprise: 70
meta_title: Set up an ingress controller for Label Studio Kubernetes Deployments
meta_description: Set up an ingress controller to manage load balancing and access to Label Studio Kubernetes deployments for your data science and machine learning projects.
section: "Install & Setup"
parent: "install_k8s"
parent_enterprise: "install_enterprise_k8s"
---

Set up an ingress controller to manage Ingress, the Kubernetes resource that exposes HTTP and HTTPS routes from outside your Kubernetes cluster to the services within the cluster, such as Label Studio rqworkers and others.  

Select the best option for your deployment:
- Ingress for Amazon Elastic Kubernetes Service (EKS)
- Ingress for Google Kubernetes Engine (GKE)
- Ingress for Microsoft Azure Kubernetes Service (AKS)
- Ingress using nginx (cloud-agnostic)
- Terminate TLS on the Load Balancer (cloud-agnostic)

Configure ingress before or after setting up [persistent storage](persistent_storage.html), but before you deploy Label Studio.

!!! note 
    You only need to set up an ingress controller if you plan to deploy Label Studio on Kubernetes. 

## Configure ingress for Amazon EKS

If you plan to deploy Label Studio onto Amazon EKS, configure ingress. 

1. Install the AWS Load Balancer Controller to install an ingress controller with default options. See the documentation for [AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html) in the Amazon EKS user guide.
2. After installing the AWS Load Balancer Controller, configure SSL certificates using the AWS Certificate Manager (ACM). See [Requesting a public certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) in the ACM user guide.
3. Update your `ls-values.yaml` file with the ingress details like the following example. Replace `"your_domain_name"` with your hostname.
```yaml
app:
  ingress:
    enabled: true
    path: /*
    host: "your_domain_name"
    className: alb
    annotations: 
      alb.ingress.kubernetes.io/scheme: internet-facing
      alb.ingress.kubernetes.io/target-type: ip
```

!!! note
    If you want to configure a certificate that you create in the ACM for the load balancer, add this annotation (updated for your certificate) to your `ls-values.yaml` file:  
```
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:region:account-id:certificate/aaaa-bbbb-cccc
```

For more details about annotations that you can configure with ingress, see the guide on [Ingress annotations](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/) in the AWS Load Balancer Controller documentation on GitHub.

## Configure ingress for GKE

Google Kubernetes Engine (GKE) contains two pre-installed Ingress classes:
- The `gce` class deploys an external load balancer
- The `gce-internal` class deploys an internal load balancer

Label Studio is considered as an external service, so you want to use the `gce` class to deploy an external load balancer.

1. Update your `ls-values.yaml` file with the ingress details like the following example. Replace `"your_domain_name"` with your hostname.
```yaml
app:
  service:
    type: nodePort
  ingress:
    enabled: true
    path: /*
    host: "your_domain_name"
    className: gce
```

!!! note 
    You can also request Google-managed SSL certificates to use on the load balancer. See the details on [Using Google-managed SSL certificates](https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs) in the Google Kubernetes Engine how-to guide. If you use a managed certificate, add an annotation to your `ls-values.yaml` file like the following example, replacing `"managed-cert"` with your ManagedCertificate object name:
```yaml
"networking.gke.io/managed-certificates": "managed-cert"
```

For more details about annotations and ingress in GKE, see [Configuring Ingress for external load balancing](https://cloud.google.com/kubernetes-engine/docs/how-to/load-balance-ingress) in the Google Kubernetes Engine how-to guide.

## Configure ingress for Microsoft Azure Kubernetes Service

Configure ingress for Microsoft Azure Kubernetes Service (AKS).

1. Deploy an Application Gateway Ingress Controller (AGIC) using a new Application Gateway. See [How to Install an Application Gateway Ingress Controller (AGIC) Using a New Application Gateway](https://docs.microsoft.com/en-us/azure/application-gateway/ingress-controller-install-new) in the Microsoft Azure Ingress for AKS how-to guide. 
2. Update your `ls-values.yaml` file with the ingress details like the following example. Replace `"your_domain_name"` with your hostname.
```yaml
app:
  ingress:
    enabled: true
    host: "your_domain_name"
    className: azure/application-gateway
```

!!! note 
    You can create a self-signed certificate to use in AGIC. Follow the steps to [Create a self-signed certificate](https://docs.microsoft.com/en-us/azure/application-gateway/create-ssl-portal#create-a-self-signed-certificate) in the Microsoft Azure Networking Tutorial: Configure an application gateway with TLS termination using the Azure portal. 

For more details about using AGIC with Microsoft Azure, see [What is Application Gateway Ingress Controller?](https://docs.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview) and [Annotations for Application Gateway Ingress Controller](https://docs.microsoft.com/en-us/azure/application-gateway/ingress-controller-annotations) in the Microsoft Azure Application Gateway documentation.

## Set up a cloud-agnostic ingress configuration

For advanced Kubernetes administrators, you can use the NGINX Ingress Controller to set up a cloud-agnostic ingress controller.

1. Deploy NGINX Ingress Controller following the relevant steps for your cloud deployment. See [Cloud deployments](https://kubernetes.github.io/ingress-nginx/deploy/#cloud-deployments) in the NGINX Ingress Controller Installation Guide. 
2. In order to terminate SSL certificates in the ingress controller, install cert-manager. See [Installation](https://cert-manager.io/docs/installation/) on the cert-manager documentation site.  
3. You must synchronize the ingress hosts with DNS. Install [ExternalDNS](https://github.com/kubernetes-sigs/external-dns#readme) and choose the relevant cloud provider for your deployment.
4. Finally, update your `ls-values.yaml` file with the ingress details like the following example. Replace `"your_domain_name"` with your hostname and `<CERTIFICATE_NAME>` with the name of the resource that you created with ExternalDNS.
```yaml
app:
  ingress:
    enabled: true
    host: "your_domain_name"
    className: nginx
    annotations:
      nginx.ingress.kubernetes.io/proxy-body-size: "200m"
    tls:
      - secretName: <CERTIFICATE_NAME>
        hosts:
          - "your_domain_name"
```

## Terminate TLS on the Load Balancer

If SSL termination is happening on a Load Balancer before traffic is forwarded to the Ingress, you'll need to set the LABEL_STUDIO_HOST environment variable.

Update your `ls-values.yaml` file with the LABEL_STUDIO_HOST environment variable like the following example. Replace `"your_domain_name"` with your hostname.
```yaml
global:
  extraEnvironmentVars:
    LABEL_STUDIO_HOST: https://your_domain_name
```
