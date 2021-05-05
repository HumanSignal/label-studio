---
title: Improve Audio Transcriptions with Label Studio
type: blog
order: 95
meta_title: Improve Audio Transcriptions with Label Studio
meta_description: Use open source data labeling software Label Studio to improve audio transcriptions of customer support calls, video conference meetings, and other audio recordings.
---

Audio transcription quality is important for accessibility, but also to ensure the quality of a service that you provide, such as customer support, or the outcomes of a meeting. 

Types of audio that needs transcribing:
- A recording from an interview with a journalism source.
- Customer support call recordings.
- User research interview recordings.
- Field interviews being used for academic research projects.
- Depositions for legal cases.
- Business meeting recordings. 
- Arbitration discussions. 

## Why audio transcription quality matters

For many cases where you're using audio transcriptions, they must be completely accurate so that patterns that you search for in the transcribed content can be easily discovered for research purposes, to help you build a stronger legal case, to more easily improve your product, or to ensure high quality customer support interactions. 

When high quality is crucial, having human involvement in the transcript is necessary. An expert transcriber brings field-specific knowledge and vernacular to a transcript, but it's difficult to scale high-quality human transcription at the price point that you might have available in your budget. Rather than shortchange the skills of an expert, you can use automated transcription to provide a shortcut. Then the expert can focus on correcting inaccuracies in the transcript rather than performing the entire transcription manually. 

With Label Studio, you can improve audio transcription quality at scale with an easy-to-use interface.

## How to improve audio transcription quality with Label Studio

In this example tutorial, you can use the AWS Transcribe service to create an automated audio transcript and combine it with human intervention in Label Studio to produce a high quality audio transcript.

## Before you start

Before you start your transcription process, make sure you have the following:
- An AWS account
- Audio files stored in Amazon S3
- The AWS command line interface tool installed ADD A LINK
- Python version 3.7 or higher installed

## Configure programmatic access to AWS Transcribe

Set up your Amazon S3 buckets with the audio files to allow the AWS Transcribe service to read the contents programmatically.

#### Create IAM user

Use the AWS CLI tool to create an identity to access the bucket on behalf of the AWS Transcribe service. Run the following command:

```bash
aws iam create-user --user-name test-transcribe-client
```

#### Create AWS credentials for programmatic access

Create the credentials for the username that you just created to allow the transcription service to access the bucket. Run the following command:

```bash
aws iam create-access-key --user-name test-transcribe-client
{
    "AccessKey": {
        "UserName": "test-transcribe-client",
        "Status": "Active",
        "CreateDate": "2021-05-04T15:23:21Z",
        "SecretAccessKey": "soHt5...",
        "AccessKeyId": "AKIA..."
    }
}
```
Set the AWS access key ID and AWS secret access key using the `aws configure` command. HERE IS A LINK OR SOME MORE INFO ON HOW TO DO THAT.

#### Create policy to access AWS Transcribe

In order to allow the AWS Transcribe service to access your bucket, you must set a policy with your identity and access management STUFF AND THINGS HERE IS ALSO A LINK FOR WHAT THIS IS. 

Create a file with the following contents and name it `TranscribePolicy.json`:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "transcribe:*"
            ],
            "Resource": "*",
            "Effect": "Allow"
        }
    ]
}
```

From the command line, run the following to attach the policy to the user:

```bash
aws iam put-user-policy --user-name test-transcribe-client --policy-name TestTranscribePolicy --policy-document file://TranscribePolicy.json
```

## Create Label Studio tasks

AWS Transcribe service runs transcription job on each audio file from your S3 bucket. HOW/WHEN DOES IT DO THAT

OK IT APPEARS THAT WE'RE WRITING A PYTHON SCRIPT TO DO ALL THESE OPERATIONS, INTRODUCE THIS SECTION ACCORDINGLY. 

First specify the list of URI to audio files: 

```python
audio_files = [
    's3://htx-pub/datasets/audio/f2bjrop1.0.wav',
    's3://htx-pub/datasets/audio/f2bjrop1.1.wav',
    's3://htx-pub/datasets/audio/f2btrop6.0.wav'
]
```

Then create AWS Transcribe client. It will use credentials & IAM role from previous steps: 

```python
import boto3
transcribe_client = boto3.client('transcribe', region_name='us-east-1')
``` 

Then we need to get the job by job name:
```python
from botocore.exceptions import ClientError

def get_job(client, job_name):
    """Check if current job already exists"""
    try:
        response = client.get_transcription_job(
            TranscriptionJobName=job_name
        )
        return response
    except ClientError:
        return

```

and creating Label Studio task with audio preannotated with textual transcription based on the AWS Transcribe job results:

```python
import requests

def create_task(file_uri, job):
    try:
        download_uri = job['TranscriptionJob']['Transcript']['TranscriptFileUri']
        results = requests.get(download_uri).json()['results']
        transcriptions = [r['transcript'] for r in results['transcripts']]
        confidence = sum(float(item['alternatives'][0]['confidence']) for item in results['items'] if item['type'] == 'pronunciation') / \
            sum(1.0 for item in results['items'] if item['type'] == 'pronunciation')

    except Exception as exc:
        print(exc)
    else:
        return {
            'data': {'audio': file_uri},
            'predictions': [{
                'result': [{
                    'from_name': 'transcription',
                    'to_name': 'audio',
                    'type': 'textarea',
                    'value': {'text': transcriptions}
                }],
                'score': confidence
            }]
        }
```


Finally define the function to create AWS Transcribe job and get Label Studio tasks from resulted audio transcriptions:

```python
import time

def transcribe_file(job_name, file_uri, transcribe_client, media_format='wav', language_code='en-US'):
    job = get_job(transcribe_client, job_name)
    if job:
        print(f'Transcription job {job_name} already exists.')
        return create_task(file_uri, job)

    print(f'Start transcription job {job_name}')
    transcribe_client.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': file_uri},
        MediaFormat=media_format,
        LanguageCode=language_code
    )

    max_tries = 60
    while max_tries > 0:
        max_tries -= 1
        job = transcribe_client.get_transcription_job(TranscriptionJobName=job_name)
        job_status = job['TranscriptionJob']['TranscriptionJobStatus']
        if job_status in ['COMPLETED', 'FAILED']:
            print(f'Job {job_name} is {job_status}.')
            if job_status == 'COMPLETED':
                return create_task(file_uri, job)
        else:
            print(f'Waiting for {job_name}. Current status is {job_status}.')
        time.sleep(10)
```


Run all together and create `tasks.json` to import to Label Studio: 
THIS APPEARS TO BE A SEPARATE PYTHON SCRIPT TO RUN SEPARATELY... WHY IS THAT? WHAT DOES IT RUN ON? THE OUTPUT OF THE LAST STEP?

```python
import os
import json

tasks = []
for audio_file in audio_files:
    job_name = os.path.splitext(os.path.basename(audio_file))[0]
    task = transcribe_file(job_name, audio_file, transcribe_client)
    if task:
        tasks.append(task)
output_file = 'data/aws-transcribe-output/tasks.json'
with open(output_file, mode='w') as f:
    json.dump(tasks, f, indent=2)
print(f'Congrats! Now import {output_file} into Label Studio.')
```

Now you can create Label Studio **Audio Transcription** project and upload `tasks.json`. Since we specify `s3://` URLs to audio files, we need to tell the app use globally installed AWS credentials to create presigned audio URLs. To do this, expose the following variable:

```bash
export USE_DEFAULT_S3_STORAGE=true
```

Now start Label Studio app via `label-studio`, upload created `tasks.json` and choose **Audio Transcription** project.


OKAY IT SEEMS AS THOUGH AT SOME POINT WE NEED TO INSTALL LABEL STUDIO 
