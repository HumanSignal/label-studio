---
title: Upgrade Label Studio Enterprise
short: Upgrade Label Studio
tier: enterprise
type: guide
order: 0
order_enterprise: 75
meta_title: Upgrade Label Studio Enterprise
meta_description: Steps you should take when upgrading Label Studio Enterprise.
section: "Install & Setup"
parent: "install"
parent_enterprise: "install_enterprise"
date: 2023-09-27 10:57:03
---

If you are using Label Studio Enterprise Cloud, all upgrades and updates are automatically deployed. 

If you are using the on-premises version of Label Studio, you will need to take additional steps. 

## Upgrade process overview

1. [Back up](backup_enterprise) your databases (development and production). 
2. Perform the upgrade on your development server first. 
3. Run health checks and tests. ([See below.](#Checks-after-upgrading))
4. Perform the upgrade on your production server. 

## Upgrade using Helm

If you installed Label Studio Enterprise in a Kubernetes environment, you can upgrade using Helm: 

1. Determine the latest tag version of Label Studio Enterprise and add/replace the following in your `ls-values.yaml` file: 
   ```yaml
   global:
     image:
       tag: "20210914.154442-d2d1935"
   ```
2. After updating the values file, retrieve the latest updates for the Helm chart:
   ```shell
   helm repo update heartex
   ```
3. Run the following from the command line to upgrade your deployment:
   ```shell
   helm upgrade <RELEASE_NAME> heartex/label-studio -f ls-values.yaml
   ```
   If you want, you can specify a version from the command line:
   ```shell
   helm upgrade <RELEASE_NAME> heartex/label-studio -f ls-values.yaml --set global.image.tag=20210914.154442-d2d1935
   ```
   This command overrides the tag value stored in `ls-values.yaml`. You must update the tag value when you upgrade or redeploy your instance to avoid version downgrades.


## Upgrade using Docker Compose

If you installed Label Studio Enterprise through Docker, you can upgrade using the following steps:

1. Edit `docker-compose.yaml` to update the Label Studio Enterprise version. 
2. Run Docker:
   
   ```shell
   docker compose up -d
   ```


## Checks after upgrading

#### Test 1

1. Create a new project, preferably using a more complex labeling configuration. 
2. Import tasks to the new project. 
3. From the project, click **Label All Tasks**. Label a few tasks and then exit the label stream. 
4. Label the same tasks using Quick View mode (click the tasks to open them). 
5. Review the labeled tasks.  
6. From the project's dashboard, ensure that your work is reflected accurately (for example, if you label one task with two annotations, the dashboard should reflect non-zero statistics for the project). 
7. Export the tasks and verify that the JSON file accurately reflects the work that you did. 

#### Test 2

1. Select a pre-existing project. 
2. Repeat the steps from Test 1, starting from step #2. 

Ideally, you would complete this test on 3-4 projects, each with different labeling configurations and data types.