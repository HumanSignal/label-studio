---
title: Using Label Studio to improve Audio Transcriptions
type: blog
order: 95
meta_title: Using Label Studio to improve Audio Transcriptions
meta_description: Using Label Studio to improve Audio Transcriptions 
---

## Before you start

Ensure you have

1. AWS account
2. AWS cli tool
3. Python >= 3.7

## Configure programmatic access for using AWS Transcribe

#### Create IAM user

```bash
aws iam create-user --user-name test-transcribe-client
```

#### Create AWS credentials for programmatic access

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
Set AWS access key Id and AWS secret access key with `aws configure` command.

#### Create policy to access AWS Transcribe

Create file `TranscribePolicy.json`:

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

Attach policy to the user:

```bash
aws iam put-user-policy --user-name test-transcribe-client --policy-name TestTranscribePolicy --policy-document file://TranscribePolicy.json
```

## Create Label Studio tasks

AWS Transcribe service runs transcription job on each audio file from your S3 bucket. First specify the list of URI to audio files:

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

Now you can create Label Studio **Audio Transcription** project and upload `tasks.json`. Since we specify `s3://` URLs to audio files, we need to tell the app use globally installed AWS credentials to create presigned audio URLs. To do this, the following variable should be exposed first:

```bash
export USE_DEFAULT_S3_STORAGE=true
```

Now start Label Studio app via `label-studio`, upload created `tasks.json` and choose **Audio Transcription** project.
