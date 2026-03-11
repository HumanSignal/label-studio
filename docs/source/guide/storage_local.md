---
title: Set up local project storage
short: Local
type: guide
tier: all
order: 157
order_enterprise: 157
meta_title: Set up local storage
meta_description: "How to set up source and target storage for local files."
section: "Import & Export"
parent: "storage"
parent_enterprise: "storage"
---

<div class="enterprise-only">

!!! note
    Local Storages are available for on-premises deployments only. 
    
    Label Studio Cloud (`app.humansignal.com`) doesn't support them.
  
</div>
  
If you have local files that you want to add to Label Studio from a specific directory, you can set up a specific local directory on the machine where Label Studio is running as source or target storage. Label Studio steps through the directory recursively to read tasks.

Keep in mind that serving data from the local file system can be a **security risk**. 

## Prerequisites

Add these environment variables:

- `LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true`
- `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` and set it to a directory on your machine. This must be a parent directory of the folder or folders where your local files are located. See [Directory examples](#Directory-examples) below.

!!! note
    When setting your file root on Windows, use double backslashes e.g. 
    
    `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=C:\\data\\media`

See [Set environment variables](https://labelstud.io/guide/start#Set-environment-variables) for more about using environment variables.

If you are using Docker, see [Run Label Studio on Docker and use local storage](https://labelstud.io/guide/start#Run-Label-Studio-on-Docker-and-use-Local-Storage). 

### Directory examples

#### Mac/Unix example

You have the following directory structure:

```
/home/user/
└── ls-demo
    ├── my-data
    │   ├── image1.png
    │   ├── image2.png
    │   ├── text1.txt
    │   └── text2.txt
    └── audio
        ├── audio1.mp3
        └── audio2.mp3
```

If you know you will eventually want to point to files in both the `my-data` and `audio` folders, you would set your environment variables as follows:

```bash
export LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true
export LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/home/user
```
Then when you configure your local storage in the UI as [outlined below](#Create-a-source-storage-connection), your absolute local path would be (to have the option to reference files in both folders):

**Absolute local path:** home/user<span style="color:red">/ls-demo</span> 

Or to pull from only one folder:

**Absolute local path:** home/user<span style="color:red">/ls-demo/my-data</span> 

#### Windows example

You have the following directory structure:

```
C:\Users\YourName\Documents\
└── ls-demo
    ├── my-data
    │   ├── image1.png
    │   ├── image2.png
    │   ├── text1.txt
    │   └── text2.txt
    └── audio
        ├── audio1.mp3
        └── audio2.mp3
```

If you know you will eventually want to point to files in both the `my-data` and `audio` folders, you would set your environment variables as follows:

```bash
set LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true
set LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=C:\\Users\\YourName\\Documents
```

Then when you configure your local storage in the UI as [outlined below](#Create-a-source-storage-connection), your absolute local path would be (to have the option to reference files in both folders):

**Absolute local path:** C:\Users\YourName\Documents<span style="color:red">\ls-demo</span>

Or to pull from only one folder: 

**Absolute local path:** C:\Users\YourName\Documents<span style="color:red">\ls-demo\my-data</span>

## Create a source storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Source Storage**.

Select **Local Files** and click **Next**.

#### Configure Connection

Complete the following fields and then click **Test connection**:


* **Storage Title**
  Enter a name to identify the storage connection.

* **Absolute local path**

    This field is pre-filled with the path you specified earlier in the `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` value. 
    
    Here, you can append the sub-directory that you want to use.

    For example, given the sample [directory structures](#Directory-examples) listed above, if you are only accessing files in the `my-data` folder, you can append `ls-demo/my-data` to your absolute local path:

    **Mac:**

    * `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=home/user`

    * **Absolute local path:** home/user<span style="color:red">/ls-demo/my-data</span>

    **Windows:** 

    * `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=C:\\Users\\YourName\\Documents`

    * **Absolute local path:** C:\Users\YourName\Documents<span style="color:red">\ls-demo\my-data</span>



#### Import Settings & Preview

Complete the following fields and then click **Load preview** to ensure you are syncing the correct data:

<div class="noheader rowheader">

| | |
| --- | --- |
| Import Method | Select whether you want create a task for each file in your local directory or whether you would like to use a JSON/JSONL/Parquet file to define the data for each task. <br /><br />For example, if your labeling tasks are simply annotating a single image, and you are pointing to a directory full of these images, you can set this to **Files**. <br /><br />But if you are annotating multiple pieces of data, like two images within a single task, or an image and a text file in the same task, you will need to set this to **Tasks**. See [Tasks with local storage file references](#Tasks-with-local-storage-file-references) below.   |
| File Name Filter | Specify a regular expression to filter files. Use `.*` to collect all files. |
| Scan all sub-folders | Enable this option to perform a recursive scan across subfolders within your local directory. |

</div>

#### Review & Confirm

If everything looks correct, click **Save & Sync** to sync immediately, or click **Save** to save your settings and sync later.

!!! info Tip
    You can also use the API to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/local/sync).

## Tasks with local storage file references 

If your labeling configuration includes multiple object tags (for example, each task will include an audio file and a text file, or two audio files, or an image file and a text file, etc), you will need to define the tasks in a JSON/JSONL/Parquet file. 

!!! error Enterprise
    Parquet is only supported in Label Studio Enterprise. 

In this case, you will need to do the following:

- Set up local storage using the steps above, pointing to the directory where all of your data files are located
- **Import Method**--Set this to **Tasks**
- **File Name Filter**--Leave this field blank
- When you you get to the **Review & Confirm** step, click **Save** instead of **Save & Sync** (this is to avoid automatically creating a separate task for each file in your local storage directory)

And then when you specify data files in your task files, you will need to use the format:

`/data/local-files/?d=path/file`

### Example 1: Data files in a single folder

Given the following directory structure, say you want to pull files **only** from `my-data`. 

```
/home/user/ls-demo
├── my-data
│   ├── image1.png
│   ├── image2.png
│   ├── text1.txt
│   └── text2.txt
└── audio
    ├── audio1.mp4
    └── audio2.mp4
```
So you set up your local file storage as follows:

`LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=home/user/ls-demo`

**Absolute local path:** home/user/ls-demo<span style="color:red">/my-data</span>
    
When you reference files within your tasks, you will need to repeat what you appended to the absolute local path (`my-data`) + the file name. 

```json
[{
 "data": {
    "image": "/data/local-files/?d=my-data/image1.png",
    "text": "/data/local-files/?d=my-data/text1.txt"
  }
},
{
 "data": {
    "image": "/data/local-files/?d=my-data/image2.png",
    "text": "/data/local-files/?d=my-data/text2.txt"
  }
}]
```

### Example 2: Data files across folders

Given the following directory structure, say you want to pull files from `my-data` and `audio`. 

```
/home/user/ls-demo
├── my-data
│   ├── image1.png
│   ├── image2.png
│   ├── text1.txt
│   └── text2.txt
└── audio
    ├── audio1.mp3
    └── audio2.mp3
```
So you set up your local file storage as follows:

`LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=home/user`

**Absolute local path:** home/user<span style="color:red">/ls-demo</span>
    
When you reference files within your tasks, you will need to repeat what you appended to the absolute local path (`ls-demo`) + the subfolder + the file name. 

```json
[{
 "data": {
    "image": "/data/local-files/?d=ls-demo/my-data/image1.png",
    "text": "/data/local-files/?d=ls-demo/my-data/text1.txt",
    "audio": "/data/local-files/?d=ls-demo/audio/audio1.mp3"
  }
},
{
 "data": {
    "image": "/data/local-files/?d=ls-demo/my-data/image2.png",
    "text": "/data/local-files/?d=ls-demo/my-data/text2.txt",
    "audio": "/data/local-files/?d=ls-demo/audio/audio2.mp3"
  }
}]
```

### Importing the task files into Label Studio

There are several ways to get your JSON/JSONL/Parquet files into Label Studio:

- Upload them directly in the UI
- [Use the API](https://api.labelstud.io/api-reference/api-reference/projects/import-tasks)
- Add them to your local file storage and use the file name filter to only sync JSON/JSONL/Parquet files
- Set up a second source storage connection and put the task files there

Although the UI has since changed, this video demonstrates how to setup local storage from scratch and import JSON tasks in a complex task format that are linked to the local storage files.

<iframe class="video-border" width="100%" height="400vh" src="https://www.youtube.com/embed/lo6ncQajbdU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>  

## Create a target storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Target Storage**.

Select **Local Files** and complete the following fields:


* **Storage Title**
  Enter a name to identify the storage connection.

* **Absolute local path**

    This field is pre-filled with the path you specified earlier in the `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` value. 
    
    Here, you can modify this field to append the remainder of the path to your the folder where you want to set up target storage. 

* **Can delete objects from storage**
    
    Enable this option if you want to delete annotations stored in the container when they are deleted in Label Studio.

After adding the storage, click **Save**. 

!!! info Tip
    You can also use the API to [sync export storage](https://api.labelstud.io/api-reference/api-reference/export-storage/local/sync).

## Add storage with the Label Studio API

You can also use the API to programmatically create connections. [See our API documentation.](https://api.labelstud.io/api-reference/introduction/getting-started)

## Set up local storage with Docker

If you're using Label Studio in Docker, you need to mount the local directory that you want to access as a volume when you start the Docker container. See [Run Label Studio on Docker and use local storage](https://labelstud.io/guide/start#Run-Label-Studio-on-Docker-and-use-Local-Storage).

<div class="opensource-only">

!!! note "Community Edition auto-detection for Docker"
    In the open source Community Edition, if `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` and `LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED` are not set, Label Studio automatically looks in the current working directory for folders named `mydata` or `label-studio-data`.
    When you use the official Docker image, the application runs from `/label-studio`, so you can mount a host folder to `/label-studio/mydata` or `/label-studio/label-studio-data` inside the container to enable local file serving without additional configuration.

</div>

