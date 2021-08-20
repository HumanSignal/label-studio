---
title: Retrain your Amazon Sagemaker model automatically with Label Studio and Webhooks
type: blog
order: 90
image: /images/webhook-blog/
meta_title: 
meta_description: Use webhooks from open source data labeling software Label Studio to seamlessly integrate your AWS Lambda and Amazon Sagemaker model development pipeline for your machine learning and data science projects.
---

Retrain your Amazon Sagemaker model automatically with Label Studio and Webhooks
OR Automatically retrain machine learning models with Amazon Sagemaker, Label Studio, and webhooks
OR Upgrade your SageMaker model training pipeline with Label Studio


PUT A STYLIZED GRAPHIC HERE OF THE SYSTEMS AS PART OF A PIPELINE

## Intro

semantic image segmentation 
ResNet50 model

USE CASE TRYING TO ACCOMPLISH/SOLVE? 

example pipeline 
why integrate

stuff about webhooks

Why you might want to integrate LS with SageMaker Ground Truth

Need to cover the following scenarios :
1. I want to improve/adapt the model to the corner cases, but can’t share it to SMGT service due to:

internal team

complex labeling scenarios

2. I use LS + SageMaker already, but now I can reduce the cost of integration

3. I use SageMaker, but now realized that I need to relabel the data / improve my model




## steps (overview)

Integrate to your pipeline

1. install LS in AWS, need to know the LS ARN
1. set up S3 bucket with different folders (AND MAYBE UPLOAD IMAGES)
2. set up sagemaker
3. set up lambda
4. set up amazon api gateway
5. install and set up label studio
- set up image segmentation project
- configure source/target storage
- set up webhooks
- sync source storage
6. start labeling!

PUT AN IMAGE HERE OF THE DETAILED WORKFLOW


## prerequisites

- have LS in AWS
- know the LS ARN
- have a model in sagemaker 

[awscli](https://aws.amazon.com/cli/)
[jq](https://stedolan.github.io/jq/)

make decisions
- set up a checkpoint of number of annotations after which to start retraining the model
  (here's why to pick this number, and how long it will take to retrain the model with that number)

## set up amazon s3 with images

set up amazon s3 storage with images and prefixes

here's why to do prefixes this way
here's how many images to have and how to split them


Set up two buckets, one for the images before you annotate them and another for storing the annotated images. 
From the command line, run the following:
```bash
aws s3 mb s3://showcase-src-bucket
aws s3 mb s3://showcase-dest-bucket
```

Then, copy the data to the source bucket:
```bash
aws s3 cp --recursive images/ s3://showcase-src-bucket
```

mAYBE upload images too

## Set up your model in amazon sagemaker

bleep bloop setup steps from Kostya

## Set up AWS Lambda function 

- here's what the lambda function does
  > lambda function counts the number of annotations created and prompts retraining after 100 have been completed (a "ready to train" checkpoint of sorts)
- here's why to do that

Set up the IAM policy to allow the AWS function to interact with Label Studio (RIGHT???)

From the command line, create a role with the necessary permissions to allow the AWS Lambda function to interact with Label Studio:
```bash
ASSUME_POLICY=$(echo -n '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}')
ROLE_ARN=$(aws iam create-role \
    --role-name LsCustomWebhook \
    --assume-role-policy-document "$ASSUME_POLICY" \
    --output text \
    --query 'Role.Arn')
```

Then attach the role to the Lambda function (??)
```bash
aws iam attach-role-policy --role-name LsCustomWebhook --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
POLICY=$(echo -n '{"Version":"2012-10-17","Statement":[{"Sid":"VisualEditor0","Effect":"Allow","Action":["sagemaker:StartPipelineExecution","sagemaker:InvokeEndpoint"],"Resource":"*"}]}')
POLICY_ARN=$(aws iam create-policy \
    --policy-name AllowSmInvokeEndpoint \
    --policy-document "$POLICY" \
    --output text \
    --query 'Policy.Arn')
aws iam attach-role-policy --role-name LsCustomWebhook --policy-arn $POLICY_ARN
```

### Set up the Lambda function

First, zip up the example AWS Lambda function that does the following:
- process the label studio ANNOTATION_CREATED function
- parses the body for the count of annotations created
- OTHERSTUFFTOO

From the command line, run the following:
```bash
zip LsCustomWebhook.zip LsCustomWebhook.py
```

Create the function in AWS Lambda. From the command line, run the following:
```bash
aws lambda create-function --function-name LsCustomWebhook --role $ROLE_ARN --runtime python3.8 --handler LsCustomWebhook.lambda_handler --zip-file fileb://LsCustomWebhook.zip
```

Update the function FORTHESEREASONS (to specify the endpoint of the Sagemaker model). From the command line, run the following:
```bash
aws lambda update-function-configuration --function-name LsCustomWebhook --environment Variables='{ENDPOINT_NAME="< SageMaker Endpoint Name >"}'
```

Then, store the ARN of the function as an environment variable so that the webhook function script can reference it. From the command line, run the following:
```bash
LAMBDAARN=$(aws lambda list-functions --query "Functions[?FunctionName==\`LsCustomWebhook\`].FunctionArn" --output text)
```

## set up the amazon API gateway 
to communicate across all the AWS services and stuff

> If you're using amazon VPC, you can also use a VPC endpoint instead of the amazon API gateway

Create an AWS RestAPI gateway configuration. Set several environment variables and run several commands.

WHEREANDHOWDOESTHISHAPPEN? 

This example uses us-east-2 as a default region. If you're using a different AWS region, update the `REGION` environment variable. 

```bash
REGION=us-east-2

GATEWAY_ID=$(aws apigateway create-rest-api \
--name 'LsCustomWebhookGateway' | jq -r .id)

GATEWAY_ROOT_ID=$(aws apigateway get-resources \
--rest-api-id "$GATEWAY_ID" | jq -r '.items[] | select(.path == "/").id')

AWS_GATEWAY_LAMBDA_RESOURCE_ID=$(aws apigateway create-resource \
--rest-api-id "$GATEWAY_ID" \
--parent-id "$GATEWAY_ROOT_ID" \
--path-part LcWebHook | jq -r .id)

aws apigateway put-method \
--rest-api-id "$GATEWAY_ID" \
--resource-id "$AWS_GATEWAY_LAMBDA_RESOURCE_ID" \
--http-method POST \
--authorization-type "NONE"

# --authorization-type "NONE" -- not secured, advanced users may secure at their own by this documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-settings-method-request.html#setup-method-request-authorization

aws apigateway put-integration \
--rest-api-id "$GATEWAY_ID" \
--resource-id "$AWS_GATEWAY_LAMBDA_RESOURCE_ID" \
--http-method POST \
--type AWS \
--integration-http-method POST \
--uri arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDAARN}/invocations

aws apigateway create-deployment --rest-api-id $GATEWAY_ID --stage-name prod
```

After you create the gateway, it becomes available at the following URL:
```html
https://$GATEWAY_ID.execute-api.${REGION}.amazonaws.com/prod/LcWebHook
```

You'll use that URL as the webhook URL when you set those up in Label Studio later. 


## set up label studio 

- set up image segmentation project
  - what config?
    - any instructions to set up? 
- configure source/target storage with the amazon s3 bucket and prefixes (what are the prefixes?)
  - sync source storage to get the images to display in LS
- set up webhooks with the aws gateway link
  - send ANNOTATION_CREATED event only
    - do they need to send a payload? yes prolly to pull the count from the payload
    
Can send all of the project data in the payload of the webhook, or could also add target storage as S3 and read from that for model training (use webhook event to trigger, but sagemaker reads from the S3 bucket)

## start annotating data in LS

start labeling!
- create annotations



## What the pipeline does behind the scenes


Show that sagemaker is running with AWS CLI 
Sagemaker output goes to one of the S3 buckets into a specific folder / prefix 

## What to do with stuff

## Lessons Learned / Conclusion / Next Steps / Takeaways 
