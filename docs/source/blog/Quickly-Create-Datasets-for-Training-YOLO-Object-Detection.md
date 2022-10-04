---
title: Quickly Create Datasets for Training YOLO Object Detection with Label Studio
type: blog
order: 94
image: /images/yolo-blog/detected-homes.png
meta_title: Quickly Create Datasets for Training YOLO Object Detection with Label Studio
meta_description: Use open source data labeling software Label Studio to quickly create YOLO v3 and v4 compatible datasets for training purposes and image labels for image object detection data science and machine learning projects.
---

Object detection is an important task in machine learning, used to underpin facial recognition technologies, essential computer vision tasks for autonomous driving use cases, and more. 

Like all machine learning tasks, creating datasets and training the machine learning models for your use case is a tedious and time-consuming requirement. With Label Studio you can collaborate with a team of annotators and quickly label a training dataset for a custom YOLO object detection model.

## What is object detection?

A type of computer vision task to identify specific objects, such as people, buildings, or vehicles, in images and videos. Many different types of algorithms can be used to perform object detection on images or videos, such as [Scale-invariant feature transform (SIFT)](https://en.wikipedia.org/wiki/Scale-invariant_feature_transform), [Detectron](https://github.com/facebookresearch/Detectron), [RefineDet](https://github.com/sfzhang15/RefineDet), or [You Only Look Once (YOLO)](https://arxiv.org/pdf/1804.02767.pdf).

<br/><img src="/images/yolo-blog/detected-homes.png" alt="Screenshot of homes identified using object detection" class="gif-border" width="800px" height="459px" />

## Object detection in practice

If you're starting a housing sale website, or if you are a housing developer trying to identify the qualities of a profitable housing development, you can use object detection on aerial and street view photographs of a subdivision to identify specific objects that might be correlated to the price of a house. Using a machine learning model rather than individual assessments or interviews with homeowners allows you to gather more information more quickly.  

It's unlikely that a model exists that is already trained to perform this type of specific analysis. This is when data labeling comes in, helping you to prepare data for machine learning. Create your own dataset and train an object detection model to handle this use case. 

<br/><img src="/images/yolo-blog/labeled-homes-zoom.png" alt="Screenshot of homes and related objects labeled using Label Studio UI." class="gif-border" width="800px" height="453px" />

To make sure that the model you train is as accurate as possible, use a best-in-class object detection model such as [YOLO](https://arxiv.org/pdf/1804.02767.pdf), and train it using a dataset manually labeled by experts.   

## Start creating an object detection dataset

Develop a dataset of homes and identify pools, fences, sheds, driveways, patios, or other objects that might contribute to the relative cost or risk factors of a home. 

Use Label Studio to label a dataset of home photographs with a set of "known true" labels that you can use to train an object detection machine learning model.

When labeling your dataset for an object detection model, keep in mind the following best practices:
- Label an equal number of photographs with the features you want to identify as those without. For example, make sure there is an even distribution of homes with pools as homes without pools if you want the model to detect pools. 
- Create the bounding boxes to encompass the entire pool, driveway, or relevant components visible in the photos.
- Label at least 50 images of houses to train the model.
- Label images of the same resolution quality and from the same angles as those that you plan to process with the trained model. 
- Limit the number of objects that you want to detect to improve model accuracy for detecting those objects. 

<br/><img src="/images/yolo-blog/labeling-instructions.png" alt="Screenshot of the best practices added to the instructions for a data labeling project in the Label Studio UI and visible when labeling begins." class="gif-border" width="800px" height="386px" />

## Label the object detection dataset 

Get started labeling your dataset using Label Studio:
1. Install Label Studio.
2. Acquire an image dataset for your use case.
3. Set up the labeling project.
4. Label the data.
5. Export the data in YOLO v3 format.

### Install Label Studio

Follow the steps to [install Label Studio](/guide/install.html) on Docker or in a Python virtual environment. 

### Download a dataset

You can use your own dataset of aerial home images, convert available aerial `SID` image types into `JPG` files, or download public domain images from the web. You can [download the public domain images](https://ibb.co/album/tZZtxh) used in this blog post for demo purposes.

### Set up the labeling project

Import your data and set up the labeling interface to start labeling the training dataset. 

1. Create a project called "Home Object Detection".
2. Add the dataset of homes. 
3. Select the **Object Detection with Bounding Boxes** labeling template.
4. Change the default label names to be a list of: Home, Pool, Fence, Driveway, and Other. 	
5. Save the project. 

<br/><img src="/images/yolo-blog/project-setup.png" alt="Screenshot of the project set up in the Label Studio UI." class="gif-border" width="800px" height="429px" />

If you want, you can update the **Instructions** in the Labeling Settings for your project to include some of the best practices as reminders. 

### Label the dataset with annotations

Use Label Studio to label the dataset with annotations. To accelerate your data labeling, you can collaborate with a team of annotators to label the dataset.

<br/><img src="/images/yolo-blog/quick-label-house.gif" alt="Gif of quickly labeling an aerial image with bounding boxes for pools, homes, driveways, and fences in the Label Studio UI." class="gif-border" width="800px" height="419px" />

1. Click **Label All Tasks** to start labeling the dataset. 
2. For each image, use a keyboard shortcut to select the relevant label class, then draw a bounding box around each relevant object in the image. 

!!! info 
    Tip: Draw a bounding box in just two clicks by clicking once where you want one corner of the box, then click again where you want the opposite corner of the box.

## Output the dataset in YOLO format

To use a YOLO model to perform future home photo analysis, you'll want to train it on the dataset that you just created in Label Studio.

After you finish labeling the dataset in Label Studio, export it in YOLO v3 format to train your model.

1. In Label Studio, click **Export**.
2. Select the **YOLO** format. A `zip` file downloads in your web browser. 

The exported data has the following structure, after expanding the exported file:
```
project-ID-at-YEAR-MONTH-DAY-HOUR-MINUTE-STRING.zip
    notes.json
    classes.txt
    labels
        image_filename1.txt
        image_filename2.txt
        image_filename3.txt
        ...
    images
        image_filename1.jpg
        image_filename2.jpg
        image_filename3.jpg
        ...
```

## Train the YOLO model with the dataset

To train your YOLO model with the dataset that you created, you need to specify the class names and the number of classes, as well as a file listing URLs to all of the images that you'll use for training. See the README for the darknet YOLOv3 and YOLOv4 models for [How to train (to detect your custom objects)](https://github.com/AlexeyAB/darknet#how-to-train-to-detect-your-custom-objects).

The YOLO export from Label Studio includes a `classes.txt` file that contains the names of the classes that were used when annotating images, as well as directories including the source images in an `images` directory and `.txt` files with bounding box details for each image in the format expected by YOLO models. For example:
```txt
1 0.8524209136801734 0.6172275218289784 0.016613279671871473 0.007998986508678854
0 0.8594874169350379 0.6205552384209734 0.0072606185232622624 0.004061023919790841
1 0.8287479881701304 0.5940571972474851 0.010871468973849227 0.008614293163192694
```

## Validate your trained model 

After you set up the YOLO model environment for training, you can train your model with your custom annotated dataset. With the trained model, you can analyze new aerial images of homes and identify important objects relevant for your use case, whether you want to detect possible risk factors for home insurance or features that might increase or decrease the value of a home.

<br/><img src="/images/yolo-blog/labeled-houses.png" alt="Screenshot of labeled aerial homes with bounding boxes for pools, homes, driveways, and fences in the Label Studio UI." class="gif-border" width="800px" height="442px" />

## Key Takeaways
Creating a dataset and training a custom YOLO object detection model can take a lot of time, but with the collaborative labeling powers of Label Studio combined with the keyboard shortcuts and accelerated labeling techniques for creating bounding boxes, you can speed up your labeling process and get to training faster. Label Studio's export support of the YOLO v3 and v4 format makes it easy to quickly start training YOLO object detection models on a custom dataset after you finish annotating images.