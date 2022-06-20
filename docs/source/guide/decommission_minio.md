---
title: Decommission minio
short: Decommission minio
meta_title: Decommission minio
---

> This is too dangerous action. You may lose all your data uploaded using direct file upload.
> If you're not confident with the following steps, you can request help from the Heartex Team.

## Step 1: Configure Persistent Storage

Follow steps from [Set up persistent storage](persistent_storage.html).

## Step 2: Upgrade to the latest available Release

1. Add `MINIO_MIGRATION: true` into `global.extraEnvironmentVars` section of your `lse-values.yaml` file:
```shell
global:
  extraEnvironmentVars:
    MINIO_MIGRATION: true
```

2. Redeploy a release by following steps from [Upgrade Label Studio Enterprise](install_enterprise_k8s.html#Upgrade-Label-Studio-using-Helm)

## Step 3: Run migration script

1. Run shell in `lse-app` pod:
```shell
kubectl exec -ti deploy/<YOUR_RELEASE_NAME>-lse-app -c lse-app -- bash
```

2. Copy data from minio to a persistent storage:
```shell
JSON_LOG=0 python3 $LSE_DIR/label_studio_enterprise/manage.py minio-migrate
```

## Step 4: Ensure a successful data migration:

> This is the most important step, because minio service will be deleted in the next step.

- Try to run `Export` in some project
- Ensure that this data appeared in your bucket/volume by project_id/export

> If something goes wrong, please request help from the Heartex Team

## Step 5: Completely remove minio service:

1. Add the following map into your `lse-values.yaml` file:
```yaml
minio:
  enabled: false
```

2. Remove `MINIO_MIGRATION: true` from `global.extraEnvironmentVars` section of your `lse-values.yaml` file.

3. Redeploy a release by following steps from [Upgrade Label Studio Enterprise](install_enterprise_k8s.html#Upgrade-Label-Studio-using-Helm)
