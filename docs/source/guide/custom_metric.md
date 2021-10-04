---
title: Add a custom matching function
short: Custom matching function
badge: <i class='ent'></i>
type: guide
order: 414
meta_title: Add a Custom Matching Function for Labeling
meta_description: Label Studio Enterprise documentation about how to add a custom matching function to use for assessing annotator agreement or the quality of your annotation results for data labeling and machine learning projects.
---

Write a custom matching function to assess the quality of the annotations in your Label Studio Enterprise project. Label Studio Enterprise contains a variety of [matching functions for your project](stats.html) but if you want to assess annotations using a custom metric or a standard metric not available in Label Studio, you can write your own. 

<div class="enterprise"><p>
Label Studio Enterprise Edition includes various annotation and labeling statistics and the ability to add your own. The open source Community Edition of Label Studio does not contain these calculations. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

## Prerequisites


the label-studio-evalme library ?
hosting?
permissions ?

testing? how to test it locally or at all? 

what to consider about your labeling project / template / labeling config and how that affects your custom function


## How to write your custom matching function

what is the input and output for the matching function? 

https://github.com/heartexlabs/label-studio-enterprise/blob/feature/AWS_matching_function/label_studio_enterprise/stats/metrics.py



```python
import boto3
import json

print('Loading function')

def respond(err, res=None):
    return {
        'statusCode': '400' if err else '200',
        'body': err.message if err else json.dumps(res),
        'headers': {
            'Content-Type': 'application/json',
        },
    }


def lambda_handler(event, context):

    operations = {
        'POST': matching_function,
    }

    operation = event['httpMethod']
    if operation in operations:
        payload = json.loads(event['body'])
        #x, y = payload
        return respond(None, operations[operation](payload))
    else:
        return respond(ValueError('Unsupported method "{}"'.format(operation)))


def matching_function(payload):
    '''your matching function for annotations'''
    try:
        x = payload[0]
        y = payload[1]
        return 1 if x==y else 0
    except:
        return -1
```


## Add your custom matching function to Label Studio Enterprise




how to add your matching function code to label studio enterprise



## Troubleshoot your custom matching function


how to test your matching function code (locally), including where any errors are logged





