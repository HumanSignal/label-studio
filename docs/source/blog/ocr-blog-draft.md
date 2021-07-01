---
title: Produce quality OCR results of receipts with Tesseract and Label Studio
type: blog
order: 95
image: /images/aws-transcribe-blog/audio-transcription-illustration.png
meta_title: Produce quality OCR results with Tesseract and Label Studio
meta_description: Use open source data labeling software Label Studio to improve optical character recognition (OCR) results for receipts, invoices, menus, signs, and other important images processed with Tesseract and Python.
---

Performing optical character recognition (OCR) on images and PDFs is a challenging task, but one with many business applications, like transcribing receipts and invoices, or for digitizing archival documents for record-keeping and research. 

The open source [Tesseract](https://github.com/tesseract-ocr/tesseract) library is a great option for performing OCR on images, but it can be a challenge to tune any automated system for your particular OCR use case. 

If you've already done what you can to [treat the input](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html) and improve the likelihood of good quality output from Tesseract, next, focus on improving the accuracy of the results.

With Label Studio, you can import the output from Tesseract and use the Label Studio UI to correct the recognized text and produce a clean OCR dataset that you can use for model training or other data analysis. 

## Acquire your dataset

A common use case for OCR is recognizing text in receipts collected by an expense application.

This example uses a receipt database made available as creative commons with attribution, CORD: A Consolidated Receipt Dataset for Post-OCR Parsing, from Park, Seunghyun and Shin, Seung and Lee, Bado and Lee, Junyeop and Surh, Jaeheung and Seo, Minjoon and Lee, Hwalsuk as part of the Document Intelligence Workshop at Neural Information Processing Systems in 2019. 

This example takes advantage of the training images in the dataset. 

1. Download the CORD-1k-002.zip file from the [link in the GitHub repository for CORD](https://github.com/clovaai/cord). 
2. Expand the zip file and locate the images folder in the `train` directory. 


## Get started 

You'll need some basic Python familiarity to follow this example, but the example script works with this dataset! If you want to use your own dataset, you might need to make some changes to the script. 

You also need to [install Tesseract](https://tesseract-ocr.github.io/tessdoc/Installation.html).

## Write a script to process the images and output in Label Studio JSON format

Follow this example to construct a Python script to process the images in the receipt dataset with Tesseract and output the results in the Label Studio JSON format for predicted annotations. 

Create a python file named `tesseractocr.py` and place the following imports at the top:
```python
import tesserocr
from tesserocr import PyTessBaseAPI, RIL
import os
import json
```
### Retrieve the images and send them through the Tesseract python library

The next portion of the script uses the `tesserocr` library to process the images with Tesseract and return information about the OCR, including the text, average confidence for the entire section of text recognized, and the bounding box pixels. 

```python
images = ['example.jpg', 'example2.jpg']

# score and transcribe multiple images
with PyTessBaseAPI() as api:
    for img in images:
        api.SetImageFile(img)  # get the image file
        transcript = api.GetUTF8Text()  # define the transcripts
        confidence = api.MeanTextConf()  # store the confidence score for the entire transcript
        boxes = api.GetComponentImages(RIL.TEXTLINE, True)
        for i, (im, box, _, _) in enumerate(boxes):
            # im is a PIL image object
            # box is a dict with x, y, w and h keys
            api.SetRectangle(box['x'], box['y'], box['w'], box['h'])

```

If you want to retrieve the confidence score for all the words, see the tesserocr documentation examples and make changes to this script accordingly.

### Format the output from Tesseract for Label Studio

In order to use the Tesseract output in Label Studio, perform some basic transformations of the results to format them in the Label Studio [JSON format for predicted annotations](/guide/predictions.html). 

First, define a function to convert the pixel output from Tesseract bounding boxes into percentages of overall image size like Label Studio expects:


```python

def convert_to_ls(x, y, w, h, orig_w, orig_h):
    return round(x / orig_w * 100.0), round(y / orig_h * 100.0), \
           round(w / orig_w * 100.0), round(h / orig_h * 100)
           
```

Then set up the output in the Label Studio JSON format for predictions:

```python
def create_task(file_name):
    try:
        file_name = img 
        transcriptions = transcript
        score = confidence

    except Exception as exc:
        print(exc)
    else:
        return dict(data={'ocr': file_name},
                    predictions=[
                        {'score': score,
                         'result': [{
            'from_name': 'transcription',
            'to_name': 'image',
            'type': 'textarea',
            'value':
                {
                    "original_width": orig_w,
                    "original_height": orig_h,
                    "image_rotation": 0,
                    "value": {
                        "x": box['x'], 
                        "y": box['y'], 
                        "width": box['w'], 
                        "height": box['h'], 
                        "rotation": 0,
                        "rectanglelabels": [
                            "Text"
                        ]
                    },
                    "id": "3ZJujPZQ0E",
                    "from_name": "label",
                    "to_name": "image",
                    "type": "rectanglelabels"
                },
                {'original_width': orig_w,
                'original_height': orig_h,
                'image_rotation': 0,
                'value': {
                "x": box['x'], 
                "y": box['y'], 
                "width": box['w'], 
                "height": box['h'], 
                "rotation": 0,
                'text': transcriptions
            }} 
        ]}
    }
```

### Export the results to a file

After Tesseract has processed the images and you convert the output to [Label Studio JSON format for predictions](/guide/predictions.html), export the results to a file:

```python
# print tasks to file
tasks = []
for img in images:
    tasks.append(create_task(img))
output_file = 'tasks_ocr.json'
with open(output_file, mode='w') as f:
    json.dump(tasks, f, indent=2)
print(f'Congrats! Now import {output_file} into Label Studio.')
```

## Run the script to collect results

Save your script and run it in the same directory as the images that you downloaded (or update the script to reference the full directory with the images in it). 

## Correct the results in Label Studio

After you've processed the images with Tesseract, you can start working with them in Label Studio to make any adjustments to validate the accuracy of the OCR.

### Install and set up Label Studio

1. Install Label Studio.
2. Create a project, called `OCR Receipts` and import the data file output from the Tesseract script. Select the optical character recognition template.

### Start correcting recognized text
After you set up your project, start labeling the tasks to review the predictions from Tesseract and make any necessary changes.

1. Click **Label all Tasks** and start correcting the recognized text regions. 
2. Locate a region in the sidebar and click to update the text. 
3. When you're done, click **Update** or **Submit** to move on to the next task.

## Lessons learned

OCR is a valuable tool when automating tasks that are time-consuming and error-prone for humans. By taking advantage of existing OCR tools, you can save time and money building your own machine learning model, and then use a tool like Label Studio to improve the overall results so that you can have confidence in the dataset. 


