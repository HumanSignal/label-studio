# Cloud Storages

There are 3 basic types of cloud storages:

1. Import Storages (aka Source Cloud Storages)
2. Export Storages (aka Target Cloud Storages)
3. Dataset Storages

## Basic hierarchy 

### Import and Dataset storages example based on Google Cloud
 
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

Other dataset and import storages are implemented the same way.  