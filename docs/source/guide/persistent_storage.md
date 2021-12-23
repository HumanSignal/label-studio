---
title: Set up persistent storage 
badge: <i class='ent'/></i>
type: guide
order: 204
meta_title: Set up persistent storage with Label Studio Enterprise
meta_description: Configure persistent storage with Label Studio Enterprise hosted in the cloud to store uploaded data such as task data, user images, and more. 
---

Depending on your deployment method, set up persistent storage. 

- Docker Compose deployment
- Kubernetes deployment
- Linux server (bare metal) deployment

## Docker Compose deployment

Follow the instructions for your deployment:
- [Custom Docker Compose file](#Custom-Docker-Compose-file).
- [Heartex Docker Compose file](#Heartex-Docker-Compose-file) provided by Heartex.

### Custom Docker Compose file

If you're using a custom Docker Compose file to deploy Label Studio Enterprise, make the following changes to your `docker-compose.yaml` file:
1. Attach volume from minio to both “app” and “rqworkers” from the path `./mydata:/label-studio/data:rw`.
2. Remove the `depends_on` setting specifying `minio` and replace it with `app`.
3. Remove all environment variables from the `.env.list` file with the prefix `MINIO_`.
4. Completely remove the minio container reference from `docker-compose.yaml`.
5. After making those changes, restart your Label Studio Enterprise deployment. From the command line, run the following:
```shell
docker-compose up -d --remove-orphans
```
6. Then, delete the minio metadata:
```shell
rm -rf mydata/.minio.sys
```

### Heartex Docker Compose file 

If you're using the Docker Compose file provided by Heartex, replace it with an updated version: 
1. Use the updated Docker Compose file listed in [Start using Docker Compose](install_enterprise_docker.html#Start-using-Docker-Compose).
2. Update the `.env.list` file to remove all environment variables with the `MINIO_` prefix.
3. After making those changes, restart your Label Studio Enterprise deployment. From the command line, run the following:
```shell
docker-compose up -d --remove-orphans
```
4. Then, delete the minio metadata:
```shell
rm -rf mydata/.minio.sys
```


## Kubernetes deployed on AWS EKS or a Linux server


For AWS EKS, follow the instructions to [deploy the Amazon EFS CSI Driver to your Amazon EKS cluster](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html) in the Amazon EKS User Guide.

Redeploy using the latest version of the helm chart and the latest image release with the following additional variables added to lse-values.yaml file:
```yaml
global:
  persistence:
    enabled: true
```

From the command line of your application pod in the Kubernetes cluster, run the following to obtain the release name:
```shell
helm list
```
Then, deploy the updated release:
```shell
kubectl exec -ti deploy/<YOUR_RELEASE_NAME>-lse-app -c lse-app -- bash
```
Copy your existing data from minio to the persistent volume:
```shell
minio-mc cp --recursive local/$MINIO_STORAGE_BUCKET_NAME /label-studio/data/
```

Update the `values.yaml` file with the following set:
```yaml
minio:
  enabled: false
```

## Amazon S3-compatible storage 

Follow the instructions to configure the S3 bucket. 

Add the following values to the `lse-values.yaml` file:
```yaml
global:
  persistence:
    enabled: true
```

From the command line of your application pod of your Kubernetes cluster, run the following to obtain the release name:
```shell
helm list
```
Then use the release name to 
```shell
kubectl exec -ti deploy/<YOUR_RELEASE_NAME>-lse-app -c lse-app -- bash
```
Copy data from a bucket to persistent volume:
```shell
JSON_LOG=0 python3 $LSE_DIR/label_studio_enterprise/manage.py minio-migrate
```

Then update the `lse-values.yaml` file with the following:
```yaml
minio:
  enabled: false
```
Then redeploy Label Studio Enterprise.
