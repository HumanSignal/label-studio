# Cloud Storages

There are 3 basic types of cloud storages:

1. Import Storages (aka Source Cloud Storages)
2. Export Storages (aka Target Cloud Storages)
3. Dataset Storages (available in enterprise)

Also Label Studio has Persistent storages where LS storage export files, user avatars and UI uploads. Do not confuse `Cloud Storages` and `Persistent Storage`, they have completely different codebase and tasks. Cloud Storages are implemented in `io_storages`, Persistent Storage uses django-storages and it is installed in Django settings environment variables (see `base.py`). 

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

## How validate_connection() works

Run this command with try/except: 
1. Get client
2. Get bucket
3. For source storage only: get any file from specified prefix
4. For target storage: we don't need to check prefix, because it should be created automatically when annotation is written

Target storages use the same validate_connection() function, but without any prefix.


## Google Cloud Storage (GCS)

### Credentials 

There are two methods for setting GCS credentials:
1. Through the Project => Cloud Storage settings in the Label Studio user interface.
2. Through Google Application Default Credentials (ADC). This involves the following steps:

   2.1. Leave the Google Application Credentials field in the Label Studio UI blank.
   
   2.2. Set an environment variable which will apply to all Cloud Storages. This can be done using the following command:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=google_credentials.json
   ```
   2.3. Alternatively, use the following command:
   ```bash
   gcloud auth application-default login
   ```
   2.4. Another option is to use credentials provided by the Google App Engine or Google Compute Engine metadata server, if the code is running on either GAE or GCE.

Note: If Cloud Storage credentials are set in the Label Studio UI, these will take precedence over other methods.

     
