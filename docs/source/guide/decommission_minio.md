---
title: Decommission minio
short: Decommission minio
meta_title: Decommission minio
---

> WARNING: Decommissioning Minio is a hazardous action because you may lose all your data uploaded using direct file upload. 
For more information or support, contact the [Heartex team](hi@heartex.com).

To decommission Minio, do the following:

## Configure Persistent Storage

To configure Persistent Storage, follow the instructions in [Set up persistent storage](persistent_storage.html).

## Upgrade to the latest available Release

1. Add `MINIO_MIGRATION: true` into `global.extraEnvironmentVars` section of your `lse-values.yaml` file:
```shell
global:
  extraEnvironmentVars:
    MINIO_MIGRATION: true
```

2. Redeploy a release by following the steps from [Upgrade Label Studio Enterprise](install_enterprise_k8s.html#Upgrade-Label-Studio-using-Helm). 

## Run migration script

1. Run shell in `lse-app` pod:
```shell
kubectl exec -ti deploy/<YOUR_RELEASE_NAME>-lse-app -c lse-app -- bash
```

2. Copy data from Minio to a persistent storage:
```shell
JSON_LOG=0 python3 $LSE_DIR/label_studio_enterprise/manage.py minio-migrate
```

## Ensure a successful data migration

> Warning: Minio service will be deleted in the next step. 

- Try to run `Export` in your project.
- Ensure that this data appears in your `bucket/volume` by `project_id/export`.

> Note: For more information or support, contact the [Heartex team](hi@heartex.com).

## Completely remove Minio service

1. Add the following map to your `lse-values.yaml` file:
```yaml
minio:
  enabled: false
```

2. Remove `MINIO_MIGRATION: true` from `global.extraEnvironmentVars` section of your `lse-values.yaml` file.

3. Redeploy a release by following steps from [Upgrade Label Studio Enterprise](install_enterprise_k8s.html#Upgrade-Label-Studio-using-Helm).
