---
title: Retrain your Amazon Sagemaker model automatically with Label Studio and Webhooks
type: blog
order: 90
image: /images/webhook-blog/sagemaker-illustration.png
meta_title: 
meta_description: Use webhooks from open source data labeling software Label Studio to seamlessly integrate your AWS Lambda and Amazon Sagemaker model development pipeline for your machine learning and data science projects.
---

Retrain your Amazon Sagemaker model automatically with Label Studio and Webhooks
OR Automatically retrain machine learning models with Amazon Sagemaker, Label Studio, and webhooks
OR Upgrade your SageMaker model training pipeline with Label Studio
OR Fly through retraining your image segmentation model: An example with Label Studio, webhooks, Amazon AWS Lambda, and Amazon SageMaker


<br/><img src="/images/webhook-blog/sagemaker-illustration.png" alt="" class="gif-border" width="800px" height="377px" />


You might want to retrain your Amazon SageMaker model to improve its handling of specific corner cases, but you have complex labeling scenarios that mean you can't use the Ground Truth labeling service.  



If you need to relabel the data or otherwise improve your model in Amazon SageMaker, you can use Label Studio. 



If you want to continually retrain your model as annotators identify birds in photos, and then test the quality of the updated models. 







If you have a machine learning pipeline, or retrain your models frequently based on newly-annotated data, you know that it can be challenging to automate that process. Now that Label Studio supports webhooks, you can automatically receive updates every time a new annotation is created or a project is updated to include different labels. 

WHY WEBHOOKS

This blog post walks you through an example of using webhooks with Label Studio to trigger specific actions in your existing machine learning pipeline. 




In this example, train an image segmentation model to recognize birds based on the various parts of birds that might be visible in an image. 

<br/><img src="/images/webhook-blog/sagemaker-webhooks.png" alt="" class="gif-border" width="800px" height="661px" />

This example covers the following steps:
1. Adding public domain bird images to Amazon S3 storage.
2. Creating an image segmentation model pipeline in Amazon SageMaker using ResNet50.
3. Writing an AWS Lambda function to trigger retraining the Amazon SageMaker model based on annotation progress in Label Studio.
4. Configuring Amazon API Gateway to securely communicate between Label Studio and the AWS Lambda function.
5. Setting up a labeling project in Label Studio and annotating images.





Follow along with the entire process to go from a Label Studio installation to a full-fledged model retraining pipeline using Amazon services and Label Studio.

 
## Before you start 

This example assumes you have an Amazon AWS account with administrator privileges and that you are comfortable running commands from the command line. 

- [Install Label Studio](install.html) locally or on AWS, if you haven't already installed it.
- Install [awscli](https://aws.amazon.com/cli/) and [jq](https://stedolan.github.io/jq/)
- Download a [bird image dataset](). This blog post uses bird images from the United States Midwest, courtesy of [public domain images hosted on Flickr by the US Fish and Wildlife Service](https://www.flickr.com/photos/usfwsmidwest/). 

This example assumes an AWS region of `us-east-2`, so if you prefer to use a different region, update that information where mentioned as you follow along.

## Add bird images to Amazon S3

Add the bird images to Amazon S3 so that you can annotate them in Label Studio and so that Amazon SageMaker can easily access the annotations and source images. 

1. Make sure that you downloaded the [bird image dataset]() and save the images to a folder called `bird-images`.
2. From the command line, run the following:
```bash
aws s3 mb s3://showcase-bucket
```
3. Log in to the S3 management console and create folders to function as prefixes for the data. Create the following folders:
   
| Folder name | Description | Full URL |
| --- | --- | --- |
| bird-images | Store the source bird images before annotating. | `s3://showcase-bucket/bird-images/` |
| annotations | Store the annotation details for the bird images. | `s3://showcase-bucket/annotations/` |
| script | Store the pre-processing script used to transform the data for the Amazon SageMaker pipeline. | `s3://showcase-bucket/script/`
| model | Used by SageMaker to store the model output. | `s3://showcase-bucket/model/` |

4. Then, copy the bird image dataset to the correct bucket prefix. From the command line, run the following: 
```bash
aws s3 cp --recursive bird-images/ s3://showcase-bucket/bird-images/
```
5. Download [the preprocessing script]() from LOCATION and copy it to the correct bucket prefix. From the command line, run the following:
```bash
aws s3 cp preprocessing.py s3://showcase-bucket/script/
```

After you prepare your datasets, deploy the model pipeline in Amazon SageMaker.

## Set up your model pipeline in Amazon SageMaker





...The preprocessing script creates additional prefixes to manage the data and deletes those after the model retrains. 


### SageMaker Pipeline


Set up an IAM policy for SageMaker. 

From the command line, create a role to manage the SageMaker pipeline:


NEED TO CHANGE THE POLICY DOCUMENT FOR THIS ROLE TO ONE THAT IS FOR USERS AND HAS A PRINCIPAL

From the command line, run the following:
```bash
ROLE_ARN=$(aws iam create-role \
    --role-name SageMaker-Role \
    --assume-role-policy-document file://AHHHSOMETING.json \
    --output text \
    --query 'Role.Arn')
```

Then, apply a role policy to the role that you created that grants the role full access to Amazon SageMaker: 
```bash
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonSageMakerFullAccess --role-name SageMaker-Role
```

Then, attach a role policy that gives the role access to Amazon S3 so that it can retrieve the tasks and annotations from the S3 buckets and store the model output accordingly:

```bash
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess --role-name SageMaker-Role
```

Then, retrieve the RoleArn of the role that you just created. From the command line, run the following:
```bash
echo $ROLE_ARN
```
You need this RoleArn for the SageMaker pipeline definition. Copy the output and save it somewhere secure. 


### Create a SageMaker pipeline

In Amazon SageMaker, create a model training pipeline for the ResNet50 model, using the source images and annotations created in Label Studio and stored in Amazon S3.

Update this example Amazon SageMaker pipeline definition with the RoleArn of the SageMaker role that you set up in previous steps. Replace the `$SageMakerRoleArn` with the actual RoleArn value. 

```json
{
	"PipelineName": "WebhookShowcase",
	"PipelineDisplayName": "WebhookShowcase",
	"RoleArn": "$SageMakerRoleArn",
	"PipelineDefinition": "{\"Version\": \"2020-12-01\", \"Metadata\": {}, \"Parameters\": [{\"Name\": \"ProcessingInstanceType\", \"Type\": \"String\", \"DefaultValue\": \"ml.m5.xlarge\"}, {\"Name\": \"ProcessingInstanceCount\", \"Type\": \"Integer\", \"DefaultValue\": 1}, {\"Name\": \"TrainingInstanceType\", \"Type\": \"String\", \"DefaultValue\": \"ml.m5.xlarge\"}, {\"Name\": \"ModelApprovalStatus\", \"Type\": \"String\", \"DefaultValue\": \"PendingManualApproval\"}], \"PipelineExperimentConfig\": {\"ExperimentName\": {\"Get\": \"Execution.PipelineName\"}, \"TrialName\": {\"Get\": \"Execution.PipelineExecutionId\"}}, \"Steps\": [{\"Name\": \"ProcessingStepWebhook\", \"Type\": \"Processing\", \"Arguments\": {\"ProcessingResources\": {\"ClusterConfig\": {\"InstanceType\": \"ml.m5.xlarge\", \"InstanceCount\": 1, \"VolumeSizeInGB\": 30}}, \"AppSpecification\": {\"ImageUri\": \"257758044811.dkr.ecr.us-east-2.amazonaws.com/sagemaker-scikit-learn:0.20.0-cpu-py3\", \"ContainerArguments\": [\"--train-test-split-ratio\", \"20\"], \"ContainerEntrypoint\": [\"python3\", \"/opt/ml/processing/input/code/aws-preprocessing.py\"]}, \"RoleArn\": \"ROLE_FOR_SAGEMAKER_PIPELINE\", \"ProcessingInputs\": [{\"InputName\": \"input-1\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"S3://showcase-bucket/annotations/\", \"LocalPath\": \"/opt/ml/processing/input/raw\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}, {\"InputName\": \"input-2\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"S3://showcase-bucket/bird-images/\", \"LocalPath\": \"/opt/ml/processing/input/train\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}, {\"InputName\": \"code\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"s3://showcase-bucket/script/aws-preprocessing.py\", \"LocalPath\": \"/opt/ml/processing/input/code\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}], \"ProcessingOutputConfig\": {\"Outputs\": [{\"OutputName\": \"train_1\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://showcase-bucket/temp/train\", \"LocalPath\": \"/opt/ml/processing/output/train_1\", \"S3UploadMode\": \"EndOfJob\"}}, {\"OutputName\": \"train_1_annotation\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://showcase-bucket/temp/train_annotation\", \"LocalPath\": \"/opt/ml/processing/output/train_1_annotation\", \"S3UploadMode\": \"EndOfJob\"}}, {\"OutputName\": \"val_annotation\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://showcase-bucket/temp/validation_annotation\", \"LocalPath\": \"/opt/ml/processing/output/validation_annotation\", \"S3UploadMode\": \"EndOfJob\"}}, {\"OutputName\": \"val_data\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://showcase-bucket/temp/validation\", \"LocalPath\": \"/opt/ml/processing/output/validation\", \"S3UploadMode\": \"EndOfJob\"}}]}}}, {\"Name\": \"ImageSegmentationTrain\", \"Type\": \"Training\", \"Arguments\": {\"AlgorithmSpecification\": {\"TrainingInputMode\": \"File\", \"TrainingImage\": \"825641698319.dkr.ecr.us-east-2.amazonaws.com/semantic-segmentation:1\"}, \"OutputDataConfig\": {\"S3OutputPath\": \"S3://showcase-bucket/output/\"}, \"StoppingCondition\": {\"MaxRuntimeInSeconds\": 36000}, \"ResourceConfig\": {\"InstanceCount\": 1, \"InstanceType\": \"ml.p3.2xlarge\", \"VolumeSizeInGB\": 100}, \"RoleArn\": \"ROLE_FOR_SAGEMAKER_PIPELINE\", \"InputDataConfig\": [{\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://showcase-bucket/temp/train\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"train\"}, {\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://showcase-bucket/temp/validation\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"validation\"}, {\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://showcase-bucket/temp/train_annotation\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"train_annotation\"}, {\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://showcase-bucket/temp/validation_annotation\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"validation_annotation\"}], \"HyperParameters\": {\"backbone\": \"resnet-50\", \"algorithm\": \"fcn\", \"use_pretrained_model\": \"True\", \"num_classes\": \"4\", \"epochs\": \"10\", \"learning_rate\": \"0.0001\", \"optimizer\": \"rmsprop\", \"lr_scheduler\": \"poly\", \"mini_batch_size\": \"2\", \"validation_mini_batch_size\": \"2\"}, \"ProfilerRuleConfigurations\": [{\"RuleConfigurationName\": \"ProfilerReport-1629795191\", \"RuleEvaluatorImage\": \"915447279597.dkr.ecr.us-east-2.amazonaws.com/sagemaker-debugger-rules:latest\", \"RuleParameters\": {\"rule_to_invoke\": \"ProfilerReport\"}}], \"ProfilerConfig\": {\"S3OutputPath\": \"S3://showcase-bucket/output/\"}}, \"DependsOn\": [\"ProcessingStepWebhook\"]}, {\"Name\": \"CleanupStepWebhook\", \"Type\": \"Processing\", \"Arguments\": {\"ProcessingResources\": {\"ClusterConfig\": {\"InstanceType\": \"ml.m5.xlarge\", \"InstanceCount\": 1, \"VolumeSizeInGB\": 30}}, \"AppSpecification\": {\"ImageUri\": \"257758044811.dkr.ecr.us-east-2.amazonaws.com/sagemaker-scikit-learn:0.20.0-cpu-py3\", \"ContainerArguments\": [\"--s3_validation_annotation_path\", \"S3://showcase-bucket/temp/validation_annotation\", \"--s3_validation_path\", \"S3://showcase-bucket/temp/validation\", \"--s3_train_annotation_path\", \"S3://showcase-bucket/temp/train_annotation\", \"--s3_train_path\", \"S3://showcase-bucket/temp/train\"], \"ContainerEntrypoint\": [\"python3\", \"/opt/ml/processing/input/code/aws-cleanup.py\"]}, \"RoleArn\": \"ROLE_FOR_SAGEMAKER_PIPELINE\", \"ProcessingInputs\": [{\"InputName\": \"code\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"s3://label-studio-testdata/preprocessing/aws-cleanup.py\", \"LocalPath\": \"/opt/ml/processing/input/code\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}]}, \"DependsOn\": [\"ImageSegmentationTrain\"]}]}"
} 
```

Save the pipeline definition and details as `BirdPipeline.json` and then reference the file when you create and deploy the pipeline: 

```bash
aws sagemaker create-pipeline --cli-input-json file://BirdPipeline.json
```

After creating the pipeline, you see the PipelineArn:
```json
{
    "PipelineArn": "arn:aws:sagemaker:us-east-2:USERID:pipeline/webhookshowcase"
}
```

After creating and deploying the Amazon SageMaker pipeline, set up the AWS Lambda function that is going to manage the Label Studio webhook information and trigger the model training pipeline in SageMaker. 

## Set up an AWS Lambda function 

You can use AWS Lambda to run code. In this example, use it to process the webhook event payload from Label Studio and send a model training request to your Amazon SageMaker pipeline. 

Before you can set up the AWS Lambda function itself, prepare a user role with the appropriate permissions policies to run the code and interact with Amazon SageMaker. 

### Set up IAM policies 

Specify the policy needed by a role to process the webhook from Label Studio and run the Lambda function. From the command line, run the following:
```bash
ASSUME_POLICY=$(echo -n '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}')
```

Then, create a role with that policy. From the command line, run the following:
```bash
ROLE_ARN=$(aws iam create-role \
    --role-name LsCustomWebhook \
    --assume-role-policy-document "$ASSUME_POLICY" \
    --output text \
    --query 'Role.Arn')
```

Then attach a policy to that role to give it additional access to run Lambda functions. From the command line, run the following: 
```bash
aws iam attach-role-policy --role-name LsCustomWebhook --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

Define the policy needed to allow the Lambda function to invoke the SageMaker endpoint for the pipeline that you created with your model. From the command line, run the following:
```bash
POLICY=$(echo -n '{"Version":"2012-10-17","Statement":[{"Sid":"VisualEditor0","Effect":"Allow","Action":["sagemaker:StartPipelineExecution","sagemaker:InvokeEndpoint"],"Resource":"*"}]}')
```

Create the policy in AWS. From the command line, run the following:  
```bash
POLICY_ARN=$(aws iam create-policy \
    --policy-name AllowSmInvokeEndpoint \
    --policy-document "$POLICY" \
    --output text \
    --query 'Policy.Arn')
```

Attach the policy to the role that runs the AWS Lambda function.  From the command line, run the following: 
```bash
aws iam attach-role-policy --role-name LsCustomWebhook --policy-arn $POLICY_ARN
```

### Set up the Lambda function

After setting up the IAM role with the necessary permission policies, create and set up the Lambda function. 

This Lambda function is written in Python and counts the number of annotations created in Label Studio, based on the ANNOTATION_CREATED webhook event payload sent from Label Studio. After a "ready to train" checkpoint of 16 annotations is reached, the Lambda function invokes the Amazon SageMaker pipeline and starts the training process. 

16 annotations is the minimum number of annotations for ResNet50 model training, but if your dataset is larger than the one used in this example, you might want to update the function to use a greater number of annotations, such as 50 or 100. The number of annotations that you might want to specify for initial training would also be different than this use case, wherein we're retraining a pre-trained model to focus on a specific bird use case. 

Copy and save the following Python code as `LsCustomWebhook.py`: 
```python
import json
import boto3


def lambda_handler(event, context):
    pipeline_name = f"WebhookShowcase"
   
    event_body = event['body']
    total = int(event_body['project']['total_annotations_number'])
    fire = total > 16 and total % 16 == 0
    name = ''
    if fire:
        client = boto3.client('sagemaker')
        execution = client.start_pipeline_execution(
                    PipelineName=pipeline_name)
        name = execution['PipelineExecutionArn']
        
        
    return {
        'statusCode': 200,
        'event': json.dumps(str(f'Fired {name}' if fire else "Not fired")),
    }
```

Compress the Python script into a `zip` folder so that you can create it in AWS Lambda. From the command line, run the following:
```bash
zip LsCustomWebhook.zip LsCustomWebhook.py
```

Then, create the function in AWS Lambda. From the command line, run the following:
```bash
aws lambda create-function --function-name LsCustomWebhook --role $ROLE_ARN --runtime python3.8 --handler LsCustomWebhook.lambda_handler --zip-file fileb://LsCustomWebhook.zip
```

After the function is created, you see JSON results that contain the FunctionArn of `arn:aws:lambda:us-east-2:USERID:function:LsCustomWebhook` and the role ARN used by the function, `arn:aws:iam::USERID:role/LsCustomWebhookC`.

Update the function to specify the endpoint of the Sagemaker model. WHEREDOESTHEENDPOINTCOMEFROM From the command line, run the following:
```bash
aws lambda update-function-configuration --function-name LsCustomWebhook --environment Variables='{ENDPOINT_NAME="< SageMaker Endpoint Name >"}'
```

Store the ARN of the Lambda function so that the webhook function script can reference it. From the command line, run the following:
```bash
LAMBDAARN=$(aws lambda list-functions --query "Functions[?FunctionName==\`LsCustomWebhook\`].FunctionArn" --output text) 
```

After you set up and configure the AWS Lambda function, set up the Amazon API Gateway to permit access between AWS Lambda and Label Studio.

## Set up the Amazon API Gateway 

Set up the Amazon API Gateway to allow the webhook events sent from Label Studio to reach the AWS Lambda function. If you're using an Amazon VPC to host Label Studio, you can use a VPC endpoint instead of the Amazon API gateway, but this example only covers the setup for the API Gateway. 

Set up a number of environment variables, then run some commands using the Amazon API Gateway. 

1. Specify a region. This example uses us-east-2 as a default region. If you're using a different AWS region, update the `REGION` variable to the AWS region that you're using. From the command line, run the following:
```bash
REGION=us-east-2
```
2. Specify your account ID so that the API Gateway can use it. From the command line, run the following:
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```
3. Create an AWS Gateway ID. From the command line, run the following: 
```bash
GATEWAY_ID=$(aws apigateway create-rest-api \
--name 'LsCustomWebhookGateway' | jq -r .id)
```
4. Get the root ID for the API Gateway. From the command line, run the following:
```bash
GATEWAY_ROOT_ID=$(aws apigateway get-resources \
--rest-api-id "$GATEWAY_ID" | jq -r '.items[] | select(.path == "/").id')
```
5. Create an API Gateway resource ID for AWS Lambda. From the command line, run the following:
```bash
AWS_GATEWAY_LAMBDA_RESOURCE_ID=$(aws apigateway create-resource \
--rest-api-id "$GATEWAY_ID" \
--parent-id "$GATEWAY_ROOT_ID" \
--path-part LcWebHook | jq -r .id)
```
6. Update the API Gateway with the resource ID for AWS Lambda. By default this example does not use authorization for the HTTP request, but you might want to secure your API Gatway configuration. See [Set up method request authorization](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-settings-method-request.html#setup-method-request-authorization) in the Amazon API Gateway documentation. From the command line, run the following:
```bash
aws apigateway put-method \
--rest-api-id "$GATEWAY_ID" \
--resource-id "$AWS_GATEWAY_LAMBDA_RESOURCE_ID" \
--http-method POST \
--authorization-type "NONE"
```
7. Update the API Gateway with additional details for the Lambda function. From the command line, run the following:
```bash
aws apigateway put-integration \
--rest-api-id "$GATEWAY_ID" \
--resource-id "$AWS_GATEWAY_LAMBDA_RESOURCE_ID" \
--http-method POST \
--type AWS \
--integration-http-method POST \
--uri arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDAARN}/invocations
```
8. After performing the setup, create the Amazon API Gateway: 
```bash
aws apigateway create-deployment --rest-api-id $GATEWAY_ID --stage-name prod
```
9. Now that the API Gateway exists, add some additional permissions to the function to allow the API Gateway to run the lambda function. From the command line, run the following: 
```bash
aws lambda add-permission --function-name LsCustomWebhook \
--statement-id apigateway-get --action lambda:InvokeFunction \
--principal apigateway.amazonaws.com \
--source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${GATEWAY_ID}/*/*/*"
```
10. After you create the gateway, it becomes available at the following URL: `https://$GATEWAY_ID.execute-api.${REGION}.amazonaws.com/prod/LcWebHook`. Send webhook event payloads from Label Studio to this endpoint. To get your URL, from the command line, run the following:
```bash
echo https://$GATEWAY_ID.execute-api.${REGION}.amazonaws.com/prod/LcWebHook
```
Save the output somewhere secure. 

Now that you've finished setting up the Amazon AWS services for your pipeline configuration, it's time to start preparing to annotate some bird images.

## Set up Label Studio for data annotation

To start annotating bird images, set up an image segmentation project and connect the S3 bucket with the bird images to Label Studio. You must already have [Label Studio installed](install.html) on AWS or locally using Docker. 

### Set up an image segmentation project

INSERTWORDS

SageMaker Model expects 4 classes 
- Beak
- Wing
- Head
- Body


1. In the Label Studio UI, click **Create** to create a project. 
2. Add a project name of **Bird Segmentation**.
3. Skip importing data for now, because the data is stored in S3.
4. On the **Labeling Setup** page, select the **Semantic Segmentation with Polygons** template.
5. Remove the existing labels `Airplane` and `Car` and replace them with:
```text
Beak
Head
Wing
Body
```
6. Save the project.

### Connect the S3 bucket to Label Studio

In order to retrieve the source images of birds for annotating, and to save the annotations somewhere that the SageMaker pipeline can easily retrieve them from, connect the S3 bucket to Label Studio. 

<br/><img src="/images/webhook-blog/screenshotOfCloudStorage.png" alt="" class="gif-border" width="800px" height="" />

1. In the Label Studio UI, click **Settings** to open the project settings.
2. Click **Cloud Storage**.
3. Click **Add Source Storage**.
4. Specify a title for the storage. For example, **Source bird images**.
5. Specify a bucket name of **showcase-bucket** and a bucket prefix of **bird-images**. 
6. Specify a file filter regex of `.*jpg` so that Label Studio retrieves only images with that file extension from the S3 bucket prefix. 
7. Specify a region name of `us-east-2`, unless you're using a different region to follow along with this blog post.
8. Specify the Access Key ID, Secret Access Key, and Session Token for a user with access to S3 buckets. You can use the credentials of the user account that you used to create the S3 bucket.
9. Select the option to **Treat every bucket object as a source file**. 
10. Click **Add Storage**.
11. Click **Sync** to sync the images.

<br/><img src="/images/webhook-blog/ScreenshotOfDataManager.png" alt="" class="gif-border" width="800px" height="" />

As the images sync to Label Studio using pre-signed URLs, set up the target storage to store annotations. 
1. In the Label Studio Cloud Storage Settings, click **Add Target Storage**.
2. Specify a title for the storage. For example, **Annotated birds**.
3. Specify a bucket name of **showcase-bucket** and a bucket prefix of **annotations**. 
4. Specify a region name of `us-east-2`, unless you're using a different region to follow along with this blog post.
8. Specify the Access Key ID, Secret Access Key, and Session Token for a user with access to S3 buckets. You can use the credentials of the user account that you used to create the S3 bucket.
6. Click **Add Storage**.

### Set up the webhook URL and events

Set up the webhook URL so that you can send ANNOTATION_CREATED events from Label Studio to the Lambda function using the Amazon API Gateway so that you can trigger the SageMaker pipeline.  

1. In the Label Studio project settings, click **Webhooks**
2. Click **Add Webhook**.
3. In the **URL** field, paste the Amazon API Gateway URL created when you set up the AWS API gateway. For example, `https://$GATEWAY_ID.execute-api.${REGION}.amazonaws.com/prod/LcWebHook`.
4. Skip the **Headers** section, unless you set up authorization for the API Gateway configuration. 
5. For the **Payload** section, leave **Send payload** selected, but deselect **Send for all actions**. 
6. For **Send Payload for**, select **Annotation created**. You only want to send events to the AWS Lambda function when an annotation is created.
6. Click **Add Webhook** to save your webhook.

<br/><img src="/images/webhook-blog/ScreenshotOfWebhookSetup.png" alt="" class="gif-border" width="800px" height="" />

## Start annotating data in Label Studio

After you set up the project, you can start labeling! 

Create polygons around bird pieces

start labeling!
- create annotations

Label at least 16 bird images to trigger the pipeline for training / retraining. 


<br/><img src="/images/webhook-blog/ScreenshotOfLabeledBird.png" alt="" class="gif-border" width="800px" height="" />


<br/><img src="/images/webhook-blog/ScreenshotOfLabeledBird2.png" alt="" class="gif-border" width="800px" height="" />


<br/><img src="/images/webhook-blog/GifOfLabeledBird.gif" alt="" class="gif-border" width="800px" height="" />



## What the pipeline does behind the scenes

Check the S3 annotations prefix bucket to make sure your annotations made it there


Show that sagemaker is running with AWS CLI 

```bash
aws sagemaker list-pipelines
```

```bash
aws sagemaker list-pipeline-execution-steps --pipeline-execution-arn {ARN of your execution}
```
aws sagemaker list-pipeline-execution-steps --pipeline-execution-arn arn:aws:sagemaker:us-east-2:490065312183:pipeline/webhookshowcasedemo

Sagemaker output goes to one of the S3 buckets into a specific folder / prefix 
--> or does it? I don't have a prefix for the model output...



## What to do with stuff

What do you do with the model output after you finish setting up and configuring this pipeline? How to make this more compelling?? 


## Lessons Learned / Conclusion / Next Steps / Takeaways 







This is just one example of how you can use webhooks in Label Studio to simplify and automate part of your machine learning pipeline. You can also use webhooks to:
- Monitor model performance against ground truth annotations
- Notify experts when a new project is ready to be annotated
- Craft an active learning pipeline
- Version annotated datasets based on labeling activities



