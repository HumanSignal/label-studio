---
title: Interactive bounding boxes OCR with Tesseract 
type: guide
tier: all
order: 55
hide_menu: true
hide_frontmatter_title: true
meta_title: Interactive bounding boxes OCR in Label Studio with a Tesseract backend
meta_description: Tutorial for how to use Label Studio and Tesseract to assist with your OCR projects
categories:
    - Computer Vision
    - Optical Character Recognition
    - Tesseract
image: "/tutorials/tesseract.png"
---

<!--

-->

# Interactive bounding boxes OCR using Tesseract

Use an OCR engine for interactive ML-assisted labeling, facilitating faster 
annotation for layout detection, classification, and recognition
models.

Tesseract is used for OCR but minimal adaptation is needed to connect other OCR
engines or models.

Tested against Label Studio 1.10.1, with basic support for both Label Studio
Local File Storage and S3-compatible storage, with a example data storage with
MinIO.

## Setup process

Before you begin:
* Ensure git is installed
* Ensure Docker Compose is installed. For MacOS and Windows users,
   we suggest using Docker Desktop. 


### 1. Install Label Studio

Launch Label Studio. You can follow the guide from the [official documentation](https://labelstud.io/guide/install.html) or use the following commands:

   ```
   docker run -it \
      -p 8080:8080 \
      -v `pwd`/mydata:/label-studio/data \
      heartexlabs/label-studio:latest
   ```

   Optionally, you may enable local file serving in Label Studio

   ```
   docker run -it \
      -p 8080:8080 \
      -v `pwd`/mydata:/label-studio/data \
      --env LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true \
      --env LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/label-studio/data/images \
      heartexlabs/label-studio:latest
   ```
   If you're using local file serving, be sure to [get a copy of the API token](https://labelstud.io/guide/user_account#Access-token) from
   Label Studio to connect the model.

### 2. Create a Label Studio project

Create a new project for Tesseract OCR. In the project **Settings** set up the **Labeling Interface**.

   Fill in the following template code. It's important to specify `smart="true"` in `RectangleLabels`.
   ```
   <View>    
      <Image name="image" value="$ocr" zoom="true" zoomControl="false"
            rotateControl="true" width="100%" height="100%"
            maxHeight="auto" maxWidth="auto"/>
      
      <RectangleLabels name="bbox" toName="image" strokeWidth="1" smart="true">
         <Label value="Label1" background="green"/>
         <Label value="Label2" background="blue"/>
         <Label value="Label3" background="red"/>
      </RectangleLabels>

      <TextArea name="transcription" toName="image" 
      editable="true" perRegion="true" required="false" 
      maxSubmissions="1" rows="5" placeholder="Recognized Text" 
      displayMode="region-list"/>
   </View>
   ```

### 3. Install Tesseract OCR

Download the Label Studio Machine Learning backend repository.
   ```
   git clone https://github.com/humansignal/label-studio-ml-backend
   cd label-studio-ml-backend/label_studio_ml/examples/tesseract
   ```

Configure parameters in `example.env` file:

   ```
   LABEL_STUDIO_HOST=http://host.docker.internal:8080
   LABEL_STUDIO_ACCESS_TOKEN=<optional token for local file access>

   AWS_ACCESS_KEY_ID=<set to MINIO_ROOT_USER for minio example>
   AWS_SECRET_ACCESS_KEY=<set to MINIO_ROOT_PASSWORD for minio example>
   AWS_ENDPOINT=http://host.docker.internal:9000

   MINIO_ROOT_USER=<username>
   MINIO_ROOT_PASSWORD=<password>
   MINIO_API_CORS_ALLOW_ORIGIN=*
   ```

Depending on your data ingestion method, several configurations are possible:

**Local File Storage**

If you opted to use Label Studio Local File Storage, be sure to set the `LABEL_STUDIO_HOST` and `LABEL_STUDIO_ACCESS_TOKEN` variables. 

**S3-Compatible Storage (MinIO or AWS S3)**

Configure the backend and the MinIO server by editing the `MINIO_ROOT_USER` AND `MINIO_ROOT_PASSWORD` variables, and make the 
   `AWS_ACCESS_KEY_ID` AND `AWS_SECRET_ACCESS_KEY` variables equal to those values. You may optionally connect to your
   own AWS cloud storage by setting those variables. Note that you may need to make additional software changes to the
   `tesseract.py` file to match your particular infrastructure configuration.

> Note: If you're using this method, remove `LABEL_STUDIO_ACCESS_TOKEN` from the `example.env` file or leave it empty.

**Other remote storage**

If you host your images on any other public storage with `http` or `https` access, don't change the default `example.env` file.


### 4. Start the Tesseract and MinIO servers

   ```
   docker compose up
   ```

### 5. Upload tasks

   If you're using the Label Studio Local File Storage option, upload images
   directly to Label Studio using the Label Studio interface.

   If you're using MinIO for task storage, log into the MinIO control panel at
   `http://localhost:9001`. Create a new bucket, making a note of the name, and
   upload your tasks to MinIO. 
   
   Set the visibility of the tasks to be public.
   Further configuration of your cloud storage is beyond the scope of this
   tutorial, and you will want to configure your storage according to your
   particular needs. 
   

If using MinIO, go to the [**Cloud storage** page](https://labelstud.io/guide/project_settings#Cloud-storage) in the project settings.

   Add your source S3 storage by connecting to the S3 Endpoint
   `http://host.docker.internal:9000`, using the bucket name from the previous
   step, and Access Key ID and Secret Access Key as configured in the previous
   steps. For the MinIO example, uncheck **Use pre-signed URLS**. Check the
   connection and save the storage.

### 6. Add model in project settings

From the project settings, select the **Model** page and click [**Connect Model**](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio).

   Add the URL `http://host.docker.internal:9090` and save the model as an ML backend.

### 7. Label in interactive mode

To use this functionality, activate **Auto-Annotation** and use the `Autodetect` rectangle for drawing boxes

Example below:

![ls_demo_ocr](https://user-images.githubusercontent.com/17755198/165186574-05f0236f-a5f2-4179-ac90-ef11123927bc.gif)

Reference links: 
- https://labelstud.io/blog/Improve-OCR-quality-with-Tesseract-and-Label-Studio.html
- https://labelstud.io/blog/release-130.html
