# Cloud Storages

There are 3 basic types of cloud storages:

1. Import Storages (aka Source Cloud Storages)
2. Export Storages (aka Target Cloud Storages)
3. Dataset Storages (available in enterprise)

## Basic hierarchy 

### Import and Dataset Storages 
 
This diagram is based on Google Cloud Storage (GCS) and other storages are implemented the same way.
  
```mermaid
    graph TD;
    
    Storage-->ImportStorage;
    
    ProjectStorageMixin-->GCSImportStorage;
    ImportStorage-->GCSImportStorageBase;

    GCSImportStorageBase-->GCSImportStorage; 
    GCSImportStorageBase-->GCSDatasetStorage;

    DatasetStorageMixin-->GCSDatasetStorage;

    subgraph Google Cloud Storage
        GCSImportStorage;
        GCSImportStorageBase;
        GCSDatasetStorage;
    end
```

## Storage statuses and how they are processed

Storage (Import and Export) have different statuses of synchronization (see `class StorageInfo.Status`):

1. Initialized: storage was added, but never synced; sufficient for starting URI link resolving
2. Queued: sync job is in the queue, but not yet started
3. In progress: sync job is running
4. Failed: sync job stopped, some errors occurred
5. Completed: sync job completed successfully

```mermaid
    graph TD;

    Initialized-->Queued;
    Queued-->InProgress;
    InProgress-->Failed;
    InProgress-->Completed; 
```

Additionally, StorageInfo contains counters and debug information that will be displayed in storages:

* last_sync - time of the last successful sync
* last_sync_count - number of objects that were successfully synced
* last_sync_job - rqworker job ID
* status - string with StorageInfo.Status.choices
* traceback - last error traceback
* meta - dictionary with advanced information, including:
  - tasks_existed - pre-existing tasks in the project that will not be synced
  - time_last_ping - the sync process can be lengthy, but it should update time_last_ping every 10 (settings.STORAGE_IN_PROGRESS_TIMER) seconds. When the Storage API tries to fetch the storage, it checks time_last_ping and marks the sync process as failed if there are no updates (see the section "Expected and Unexpected Sync Terminations").

### Expected and unexpected sync terminations

All these states are present in both the open-source and enterprise editions for code compatibility. Status processing can be challenging, especially when the sync process is terminated unexpectedly. Typical situations when this happens include:

1. An exception occurred, it's a soft termination and in this case the sync job has `Failed` status. 
2. OOM error happened => RQ worker job was killed => `storage_background_failure` wasn't called.
3. RQ workers were redeployed => `storage_background_failure` wasn't called.
4. RQ workers were killed manually => `storage_background_failure` wasn't called.
5. Job was removed from RQ Queue => it's not a failure, but we need to update storage status somehow. 

To handle these cases correctly, all these conditions must be checked in ensure_storage_status when the Storage List API is retrieved.