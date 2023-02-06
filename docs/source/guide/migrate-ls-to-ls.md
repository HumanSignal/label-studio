---
title: Migrate projects between Label Studio instances
short: Migrate projects
type: guide
tier: all
order: 206
order_enterprise: 108
meta_title: Cloud and External Storage Integration
meta_description: "Migrate, copy, move project from/between one LS instance to another"
section: "Import and Export"

---

Project migration is the process of transferring tasks and settings from one instance of Label Studio to another (including LS => LSE, LSE => LS, LS => LS). This is necessary when an organization wants to move their work to a different server, consolidate multiple instances into one or start using Enterprise version. This migration process allows to preserve work and progress. By migrating projects and tasks from one Label Studio instance to another, users can ensure that their workflow remain uninterrupted, and that they can continue to use their existing data in the new environment.

The migration can be executed by Label Studio SDK. Detailed instructions can be found [in the Label Studio SDK repository](https://github.com/heartexlabs/label-studio-sdk/tree/master/examples/migrate_ls_to_ls).

<img src="/images/migrate-ls-to-ls.png"> 

## Entities to be copied

This migration script copies the following Label Studio entities between instances:

* Users
* Projects with basic settings (review and assignment settings are not supported yet)
* Tasks
* Annotations 

All these entities will be copied, but other entities are not yet supported.

Each new run of this script will generate new projects on the target instance.

## Images, audio, video and other media resources

### Uploaded files using the Label Studio GUI

Uploaded images, audio, video, and other files using the Label Studio GUI **will not be accessible or copied** to another instance. To avoid problems with file transfers, it is better to use Local Storage or S3/GCS/Azure Storages instead (the last are preferable). 


### Storage settings 

Storage settings will be copied during the migration process, so if you used S3/GCS/Azure storage, your data should be automatically accessible after the migration in most cases. If you have specific permissions and privileges set on your buckets, be sure to modify them accordingly for the target Label Studio instance.


 

   