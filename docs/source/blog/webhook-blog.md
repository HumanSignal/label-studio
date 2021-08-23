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

Script will be in the S3 folder



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
```

```bash
aws s3 mb s3://showcase-dest-bucket
```

Then, copy the data to the source bucket:
```bash
aws s3 cp --recursive images/ s3://showcase-src-bucket
```

mAYBE upload images too 

## Set up your model in amazon sagemaker


### SageMaker Pipeline


Set up an IAM policy for SageMaker. 

Create a role HERE and HOW: 

```bash:create-role
SAGE_POLICY=$(echo -n '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": ["sagemaker:*"],"NotResource": ["arn:aws:sagemaker:*:*:domain/*","arn:aws:sagemaker:*:*:user-profile/*","arn:aws:sagemaker:*:*:app/*","arn:aws:sagemaker:*:*:flow-definition/*"]},{"Effect": "Allow","Action": ["sagemaker:CreatePresignedDomainUrl","sagemaker:DescribeDomain","sagemaker:ListDomains","sagemaker:DescribeUserProfile","sagemaker:ListUserProfiles","sagemaker:*App","sagemaker:ListApps"],"Resource": "*"},{"Effect": "Allow","Action": "sagemaker:*","Resource": ["arn:aws:sagemaker:*:*:flow-definition/*"],"Condition": {"StringEqualsIfExists": {"sagemaker:WorkteamType": ["private-crowd","vendor-crowd"]}}},{"Effect": "Allow","Action": ["application-autoscaling:DeleteScalingPolicy","application-autoscaling:DeleteScheduledAction","application-autoscaling:DeregisterScalableTarget","application-autoscaling:DescribeScalableTargets","application-autoscaling:DescribeScalingActivities","application-autoscaling:DescribeScalingPolicies","application-autoscaling:DescribeScheduledActions","application-autoscaling:PutScalingPolicy","application-autoscaling:PutScheduledAction","application-autoscaling:RegisterScalableTarget","aws-marketplace:ViewSubscriptions","cloudformation:GetTemplateSummary","cloudwatch:DeleteAlarms","cloudwatch:DescribeAlarms","cloudwatch:GetMetricData","cloudwatch:GetMetricStatistics","cloudwatch:ListMetrics","cloudwatch:PutMetricAlarm","cloudwatch:PutMetricData","codecommit:BatchGetRepositories","codecommit:CreateRepository","codecommit:GetRepository","codecommit:List*","cognito-idp:AdminAddUserToGroup","cognito-idp:AdminCreateUser","cognito-idp:AdminDeleteUser","cognito-idp:AdminDisableUser","cognito-idp:AdminEnableUser","cognito-idp:AdminRemoveUserFromGroup","cognito-idp:CreateGroup","cognito-idp:CreateUserPool","cognito-idp:CreateUserPoolClient","cognito-idp:CreateUserPoolDomain","cognito-idp:DescribeUserPool","cognito-idp:DescribeUserPoolClient","cognito-idp:List*","cognito-idp:UpdateUserPool","cognito-idp:UpdateUserPoolClient","ec2:CreateNetworkInterface","ec2:CreateNetworkInterfacePermission","ec2:CreateVpcEndpoint","ec2:DeleteNetworkInterface","ec2:DeleteNetworkInterfacePermission","ec2:DescribeDhcpOptions","ec2:DescribeNetworkInterfaces","ec2:DescribeRouteTables","ec2:DescribeSecurityGroups","ec2:DescribeSubnets","ec2:DescribeVpcEndpoints","ec2:DescribeVpcs","ecr:BatchCheckLayerAvailability","ecr:BatchGetImage","ecr:CreateRepository","ecr:Describe*","ecr:GetAuthorizationToken","ecr:GetDownloadUrlForLayer","ecr:StartImageScan","elastic-inference:Connect","elasticfilesystem:DescribeFileSystems","elasticfilesystem:DescribeMountTargets","fsx:DescribeFileSystems","glue:CreateJob","glue:DeleteJob","glue:GetJob*","glue:GetTable*","glue:GetWorkflowRun","glue:ResetJobBookmark","glue:StartJobRun","glue:StartWorkflowRun","glue:UpdateJob","groundtruthlabeling:*","iam:ListRoles","kms:DescribeKey","kms:ListAliases","lambda:ListFunctions","logs:CreateLogDelivery","logs:CreateLogGroup","logs:CreateLogStream","logs:DeleteLogDelivery","logs:Describe*","logs:GetLogDelivery","logs:GetLogEvents","logs:ListLogDeliveries","logs:PutLogEvents","logs:PutResourcePolicy","logs:UpdateLogDelivery","robomaker:CreateSimulationApplication","robomaker:DescribeSimulationApplication","robomaker:DeleteSimulationApplication","robomaker:CreateSimulationJob","robomaker:DescribeSimulationJob","robomaker:CancelSimulationJob","secretsmanager:ListSecrets","servicecatalog:Describe*","servicecatalog:List*","servicecatalog:ScanProvisionedProducts","servicecatalog:SearchProducts","servicecatalog:SearchProvisionedProducts","sns:ListTopics","tag:GetResources"],"Resource": "*"},{"Effect": "Allow","Action": ["ecr:SetRepositoryPolicy","ecr:CompleteLayerUpload","ecr:BatchDeleteImage","ecr:UploadLayerPart","ecr:DeleteRepositoryPolicy","ecr:InitiateLayerUpload","ecr:DeleteRepository","ecr:PutImage"],"Resource": ["arn:aws:ecr:*:*:repository/*sagemaker*"]},{"Effect": "Allow","Action": ["codecommit:GitPull","codecommit:GitPush"],"Resource": ["arn:aws:codecommit:*:*:*sagemaker*","arn:aws:codecommit:*:*:*SageMaker*","arn:aws:codecommit:*:*:*Sagemaker*"]},{"Action": ["codebuild:BatchGetBuilds","codebuild:StartBuild"],"Resource": ["arn:aws:codebuild:*:*:project/sagemaker*","arn:aws:codebuild:*:*:build/*"],"Effect": "Allow"},{"Action": ["states:DescribeExecution","states:GetExecutionHistory","states:StartExecution","states:StopExecution","states:UpdateStateMachine"],"Resource": ["arn:aws:states:*:*:statemachine:*sagemaker*","arn:aws:states:*:*:execution:*sagemaker*:*"],"Effect": "Allow"},{"Effect": "Allow","Action": ["secretsmanager:DescribeSecret","secretsmanager:GetSecretValue","secretsmanager:CreateSecret"],"Resource": ["arn:aws:secretsmanager:*:*:secret:AmazonSageMaker-*"]},{"Effect": "Allow","Action": ["secretsmanager:DescribeSecret","secretsmanager:GetSecretValue"],"Resource": "*","Condition": {"StringEquals": {"secretsmanager:ResourceTag/SageMaker": "true"}}},{"Effect": "Allow","Action": ["servicecatalog:ProvisionProduct"],"Resource": "*"},{"Effect": "Allow","Action": ["servicecatalog:TerminateProvisionedProduct","servicecatalog:UpdateProvisionedProduct"],"Resource": "*","Condition": {"StringEquals": {"servicecatalog:userLevel": "self"}}},{"Effect": "Allow","Action": "s3:*","Resource": "*"},{"Effect": "Allow","Action": ["s3:GetObject"],"Resource": "*","Condition": {"StringEqualsIgnoreCase": {"s3:ExistingObjectTag/SageMaker": "true"}}},{"Effect": "Allow","Action": ["s3:GetObject"],"Resource": "*","Condition": {"StringEquals": {"s3:ExistingObjectTag/servicecatalog:provisioning": "true"}}},{"Effect": "Allow","Action": ["s3:CreateBucket","s3:GetBucketLocation","s3:ListBucket","s3:ListAllMyBuckets","s3:GetBucketCors","s3:PutBucketCors"],"Resource": "*"},{"Effect": "Allow","Action": ["s3:GetBucketAcl","s3:PutObjectAcl"],"Resource": ["arn:aws:s3:::*SageMaker*","arn:aws:s3:::*Sagemaker*","arn:aws:s3:::*sagemaker*"]},{"Effect": "Allow","Action": ["lambda:InvokeFunction"],"Resource": ["arn:aws:lambda:*:*:function:*SageMaker*","arn:aws:lambda:*:*:function:*sagemaker*","arn:aws:lambda:*:*:function:*Sagemaker*","arn:aws:lambda:*:*:function:*LabelingFunction*"]},{"Action": "iam:CreateServiceLinkedRole","Effect": "Allow","Resource": "arn:aws:iam::*:role/aws-service-role/sagemaker.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_SageMakerEndpoint","Condition": {"StringLike": {"iam:AWSServiceName": "sagemaker.application-autoscaling.amazonaws.com"}}},{"Effect": "Allow","Action": "iam:CreateServiceLinkedRole","Resource": "*","Condition": {"StringEquals": {"iam:AWSServiceName": "robomaker.amazonaws.com"}}},{"Effect": "Allow","Action": ["sns:Subscribe","sns:CreateTopic"],"Resource": ["arn:aws:sns:*:*:*SageMaker*","arn:aws:sns:*:*:*Sagemaker*","arn:aws:sns:*:*:*sagemaker*"]},{"Effect": "Allow","Action": ["iam:PassRole"],"Resource": "arn:aws:iam::*:role/*AmazonSageMaker*","Condition": {"StringEquals": {"iam:PassedToService": ["glue.amazonaws.com","robomaker.amazonaws.com","states.amazonaws.com"]}}},{"Effect": "Allow","Action": ["iam:PassRole"],"Resource": "arn:aws:iam::*:role/*","Condition": {"StringEquals": {"iam:PassedToService": "sagemaker.amazonaws.com"}}},{"Effect": "Allow","Action": ["athena:ListDataCatalogs","athena:ListDatabases","athena:ListTableMetadata","athena:GetQueryExecution","athena:GetQueryResults","athena:StartQueryExecution","athena:StopQueryExecution"],"Resource": ["*"]},{"Effect": "Allow","Action": ["glue:CreateTable"],"Resource": ["arn:aws:glue:*:*:table/*/sagemaker_tmp_*","arn:aws:glue:*:*:table/sagemaker_featurestore/*","arn:aws:glue:*:*:catalog","arn:aws:glue:*:*:database/*"]},{"Effect": "Allow","Action": ["glue:DeleteTable"],"Resource": ["arn:aws:glue:*:*:table/*/sagemaker_tmp_*","arn:aws:glue:*:*:catalog","arn:aws:glue:*:*:database/*"]},{"Effect": "Allow","Action": ["glue:GetDatabases","glue:GetTable","glue:GetTables"],"Resource": ["arn:aws:glue:*:*:table/*","arn:aws:glue:*:*:catalog","arn:aws:glue:*:*:database/*"]},{"Effect": "Allow","Action": ["glue:CreateDatabase","glue:GetDatabase"],"Resource": ["arn:aws:glue:*:*:catalog","arn:aws:glue:*:*:database/sagemaker_featurestore","arn:aws:glue:*:*:database/sagemaker_processing","arn:aws:glue:*:*:database/default","arn:aws:glue:*:*:database/sagemaker_data_wrangler"]},{"Effect": "Allow","Action": ["redshift-data:ExecuteStatement","redshift-data:DescribeStatement","redshift-data:CancelStatement","redshift-data:GetStatementResult","redshift-data:ListSchemas","redshift-data:ListTables"],"Resource": ["*"]},{"Effect": "Allow","Action": ["redshift:GetClusterCredentials"],"Resource": ["arn:aws:redshift:*:*:dbuser:*/sagemaker_access*","arn:aws:redshift:*:*:dbname:*"]}]}}')
ROLE_ARN=$(aws iam create-role \
    --role-name ROLE_FOR_SAGEMAKER_PIPELINE \
    --assume-role-policy-document "$SAGE_POLICY" \
    --output text \
    --query 'Role.Arn')
```
    

### Create a sagemaker pipeline

Modify the following pipeline definition according to the following

- Change parameters depending on your configuration 
-- ROLE_FOR_SAGEMAKER_PIPELINE - role created for sagemaker pipeline
-- S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ANNOTATIONS/ - your path to Label Studio annotation folder
-- S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_IMAGES/ - your path to Label Studio images folder
-- S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_SCRIPT/aws-preprocessing.py - path to preprossing script
-- S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_DATA/ - path to training data (will be deleted after model training)
-- S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_ANNOTATIONS/ - path to training data annotations (will be deleted after model training)
-- S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_DATA/ - path to validation data (will be deleted after model training)
-- S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_ANNOTATIONS/ - path to validation data annotations (will be deleted after model training)
-- S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_OUTPUT_FOLDER/ - path to output folder where model files can be found

```yaml
  {"Version": "2020-12-01", "Metadata": {}, "Parameters": [{"Name":
  "ProcessingInstanceType", "Type": "String", "DefaultValue": "ml.m5.xlarge"},
  {"Name": "ProcessingInstanceCount", "Type": "Integer", "DefaultValue": 1},
  {"Name": "TrainingInstanceType", "Type": "String", "DefaultValue":
  "ml.m5.xlarge"}, {"Name": "ModelApprovalStatus", "Type": "String",
  "DefaultValue": "PendingManualApproval"}], "PipelineExperimentConfig":
  {"ExperimentName": {"Get": "Execution.PipelineName"}, "TrialName": {"Get":
  "Execution.PipelineExecutionId"}}, "Steps": [{"Name": "ProcessingStepWebhook",
  "Type": "Processing", "Arguments": {"ProcessingResources": {"ClusterConfig":
  {"InstanceType": "ml.m5.xlarge", "InstanceCount": 1, "VolumeSizeInGB": 30}},
  "AppSpecification": {"ImageUri":
  "257758044811.dkr.ecr.us-east-2.amazonaws.com/sagemaker-scikit-learn:0.20.0-cpu-py3",
  "ContainerArguments": ["--train-test-split-ratio", "20"],
  "ContainerEntrypoint": ["python3",
  "/opt/ml/processing/input/code/aws-preprocessing.py"]}, "RoleArn":
  "ROLE_FOR_SAGEMAKER_PIPELINE", "ProcessingInputs": [{"InputName": "input-1",
  "AppManaged": false, "S3Input": {"S3Uri":
  "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ANNOTATIONS", "LocalPath":
  "/opt/ml/processing/input/raw", "S3DataType": "S3Prefix", "S3InputMode":
  "File", "S3DataDistributionType": "FullyReplicated", "S3CompressionType":
  "None"}}, {"InputName": "input-2", "AppManaged": false, "S3Input": {"S3Uri":
  "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_IMAGES", "LocalPath":
  "/opt/ml/processing/input/train", "S3DataType": "S3Prefix", "S3InputMode":
  "File", "S3DataDistributionType": "FullyReplicated", "S3CompressionType":
  "None"}}, {"InputName": "code", "AppManaged": false, "S3Input": {"S3Uri":
  "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_SCRIPT/aws-preprocessing.py", "LocalPath":
  "/opt/ml/processing/input/code", "S3DataType": "S3Prefix", "S3InputMode":
  "File", "S3DataDistributionType": "FullyReplicated", "S3CompressionType":
  "None"}}], "ProcessingOutputConfig": {"Outputs": [{"OutputName": "train_1",
  "AppManaged": false, "S3Output": {"S3Uri":
  "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_DATA", "LocalPath":
  "/opt/ml/processing/output/train_1", "S3UploadMode": "EndOfJob"}},
  {"OutputName": "train_1_annotation", "AppManaged": false, "S3Output":
  {"S3Uri": "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_ANNOTATIONS",
  "LocalPath": "/opt/ml/processing/output/train_1_annotation", "S3UploadMode":
  "EndOfJob"}}, {"OutputName": "val_annotation", "AppManaged": false,
  "S3Output": {"S3Uri":
  "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_ANNOTATIONS", "LocalPath":
  "/opt/ml/processing/output/validation_annotation", "S3UploadMode":
  "EndOfJob"}}, {"OutputName": "val_data", "AppManaged": false, "S3Output":
  {"S3Uri": "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_DATA",
  "LocalPath": "/opt/ml/processing/output/validation", "S3UploadMode":
  "EndOfJob"}}]}}}, {"Name": "ImageSegmentationTrain", "Type": "Training",
  "Arguments": {"AlgorithmSpecification": {"TrainingInputMode": "File",
  "TrainingImage":
  "825641698319.dkr.ecr.us-east-2.amazonaws.com/semantic-segmentation:1"},
  "OutputDataConfig": {"S3OutputPath":
  "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_OUTPUT_FOLDER"}, "StoppingCondition":
  {"MaxRuntimeInSeconds": 36000}, "ResourceConfig": {"InstanceCount": 1,
  "InstanceType": "ml.p3.2xlarge", "VolumeSizeInGB": 100}, "RoleArn":
  "ROLE_FOR_SAGEMAKER_PIPELINE", "InputDataConfig": [{"DataSource":
  {"S3DataSource": {"S3DataType": "S3Prefix", "S3Uri":
  "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_DATA", "S3DataDistributionType":
  "FullyReplicated"}}, "ContentType": "application/x-image", "ChannelName":
  "train"}, {"DataSource": {"S3DataSource": {"S3DataType": "S3Prefix", "S3Uri":
  "sS3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_DATA",
  "S3DataDistributionType": "FullyReplicated"}}, "ContentType":
  "application/x-image", "ChannelName": "validation"}, {"DataSource":
  {"S3DataSource": {"S3DataType": "S3Prefix", "S3Uri":
  "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_ANNOTATIONS",
  "S3DataDistributionType": "FullyReplicated"}}, "ContentType":
  "application/x-image", "ChannelName": "train_annotation"}, {"DataSource":
  {"S3DataSource": {"S3DataType": "S3Prefix", "S3Uri":
  "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_DATA",
  "S3DataDistributionType": "FullyReplicated"}}, "ContentType":
  "application/x-image", "ChannelName": "validation_annotation"}],
  "HyperParameters": {"backbone": "resnet-50", "algorithm": "fcn",
  "use_pretrained_model": "True", "num_classes": "4", "epochs": "10",
  "learning_rate": "0.0001", "optimizer": "rmsprop", "lr_scheduler": "poly",
  "mini_batch_size": "16", "validation_mini_batch_size": "8"},
  "ProfilerRuleConfigurations": [{"RuleConfigurationName":
  "ProfilerReport-1629482613", "RuleEvaluatorImage":
  "915447279597.dkr.ecr.us-east-2.amazonaws.com/sagemaker-debugger-rules:latest",
  "RuleParameters": {"rule_to_invoke": "ProfilerReport"}}], "ProfilerConfig":
  {"S3OutputPath": "S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_OUTPUT_FOLDER"}},
  "DependsOn": ["ProcessingStepWebhook"]}]}", "RoleArn":
  "ROLE_FOR_SAGEMAKER_PIPELINE", "PipelineStatus": "Active",    "CreationTime":
  "2021-08-20T21:00:44.361000+03:00", "LastModifiedTime":
  "2021-08-20T21:00:44.361000+03:00", "CreatedBy": {}, "LastModifiedBy": {}}
```

SAVE THE PIPELINE DEFINITION AND THEN REFERENCE THE FILE INSTEAD OF REFERENCING IT DIRECTLY?? 

- Create pipeline:
```bash:deploy-pipeline
aws sagemaker create-pipeline --pipeline-name WebhookShowcase --role-arn ROLE_FOR_SAGEMAKER_PIPELINE --pipeline-definition "{\"Version\": \"2020-12-01\", \"Metadata\": {}, \"Parameters\": [{\"Name\": \"ProcessingInstanceType\", \"Type\": \"String\", \"DefaultValue\": \"ml.m5.xlarge\"}, {\"Name\": \"ProcessingInstanceCount\", \"Type\": \"Integer\", \"DefaultValue\": 1}, {\"Name\": \"TrainingInstanceType\", \"Type\": \"String\", \"DefaultValue\": \"ml.m5.xlarge\"}, {\"Name\": \"ModelApprovalStatus\", \"Type\": \"String\", \"DefaultValue\": \"PendingManualApproval\"}], \"PipelineExperimentConfig\": {\"ExperimentName\": {\"Get\": \"Execution.PipelineName\"}, \"TrialName\": {\"Get\": \"Execution.PipelineExecutionId\"}}, \"Steps\": [{\"Name\": \"ProcessingStepWebhook\", \"Type\": \"Processing\", \"Arguments\": {\"ProcessingResources\": {\"ClusterConfig\": {\"InstanceType\": \"ml.m5.xlarge\", \"InstanceCount\": 1, \"VolumeSizeInGB\": 30}}, \"AppSpecification\": {\"ImageUri\": \"257758044811.dkr.ecr.us-east-2.amazonaws.com/sagemaker-scikit-learn:0.20.0-cpu-py3\", \"ContainerArguments\": [\"--train-test-split-ratio\", \"20\"], \"ContainerEntrypoint\": [\"python3\", \"/opt/ml/processing/input/code/aws-preprocessing.py\"]}, \"RoleArn\": \"ROLE_FOR_SAGEMAKER_PIPELINE\", \"ProcessingInputs\": [{\"InputName\": \"input-1\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ANNOTATIONS\", \"LocalPath\": \"/opt/ml/processing/input/raw\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}, {\"InputName\": \"input-2\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_IMAGES\", \"LocalPath\": \"/opt/ml/processing/input/train\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}, {\"InputName\": \"code\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_SCRIPT/aws-preprocessing.py\", \"LocalPath\": \"/opt/ml/processing/input/code\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}], \"ProcessingOutputConfig\": {\"Outputs\": [{\"OutputName\": \"train_1\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_DATA\", \"LocalPath\": \"/opt/ml/processing/output/train_1\", \"S3UploadMode\": \"EndOfJob\"}}, {\"OutputName\": \"train_1_annotation\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_ANNOTATIONS\", \"LocalPath\": \"/opt/ml/processing/output/train_1_annotation\", \"S3UploadMode\": \"EndOfJob\"}}, {\"OutputName\": \"val_annotation\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_ANNOTATIONS\", \"LocalPath\": \"/opt/ml/processing/output/validation_annotation\", \"S3UploadMode\": \"EndOfJob\"}}, {\"OutputName\": \"val_data\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_DATA\", \"LocalPath\": \"/opt/ml/processing/output/validation\", \"S3UploadMode\": \"EndOfJob\"}}]}}}, {\"Name\": \"ImageSegmentationTrain\", \"Type\": \"Training\", \"Arguments\": {\"AlgorithmSpecification\": {\"TrainingInputMode\": \"File\", \"TrainingImage\": \"825641698319.dkr.ecr.us-east-2.amazonaws.com/semantic-segmentation:1\"}, \"OutputDataConfig\": {\"S3OutputPath\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_OUTPUT_FOLDER\"}, \"StoppingCondition\": {\"MaxRuntimeInSeconds\": 36000}, \"ResourceConfig\": {\"InstanceCount\": 1, \"InstanceType\": \"ml.p3.2xlarge\", \"VolumeSizeInGB\": 100}, \"RoleArn\": \"ROLE_FOR_SAGEMAKER_PIPELINE\", \"InputDataConfig\": [{\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_DATA\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"train\"}, {\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"sS3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_DATA\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"validation\"}, {\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_TRAIN_ANNOTATIONS\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"train_annotation\"}, {\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_ML_VALIDATION_DATA\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"validation_annotation\"}], \"HyperParameters\": {\"backbone\": \"resnet-50\", \"algorithm\": \"fcn\", \"use_pretrained_model\": \"True\", \"num_classes\": \"4\", \"epochs\": \"10\", \"learning_rate\": \"0.0001\", \"optimizer\": \"rmsprop\", \"lr_scheduler\": \"poly\", \"mini_batch_size\": \"16\", \"validation_mini_batch_size\": \"8\"}, \"ProfilerRuleConfigurations\": [{\"RuleConfigurationName\": \"ProfilerReport-1629482613\", \"RuleEvaluatorImage\": \"915447279597.dkr.ecr.us-east-2.amazonaws.com/sagemaker-debugger-rules:latest\", \"RuleParameters\": {\"rule_to_invoke\": \"ProfilerReport\"}}], \"ProfilerConfig\": {\"S3OutputPath\": \"S3://SHOWCASE-SRC-BUCKET/PREFIX_TO_OUTPUT_FOLDER\"}}, \"DependsOn\": [\"ProcessingStepWebhook\"]}]}\", \"RoleArn\": \"ROLE_FOR_SAGEMAKER_PIPELINE\", \"PipelineStatus\": \"Active\",    \"CreationTime\": \"2021-08-20T21:00:44.361000+03:00\", \"LastModifiedTime\": \"2021-08-20T21:00:44.361000+03:00\", \"CreatedBy\": {}, \"LastModifiedBy\": {}}"
```


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

HERE'S WHAT PARAMETERS TO CHANGE

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

Create an AWS RestAPI gateway configuration. Set several environment variables and run several commands from the command line...


This example uses us-east-2 as a default region. If you're using a different AWS region, update the `REGION` environment variable. 

```bash
REGION=us-east-2
```

```bash
GATEWAY_ID=$(aws apigateway create-rest-api \
--name 'LsCustomWebhookGateway' | jq -r .id)
```

```bash
GATEWAY_ROOT_ID=$(aws apigateway get-resources \
--rest-api-id "$GATEWAY_ID" | jq -r '.items[] | select(.path == "/").id')
```


```bash
aws apigateway put-method \
--rest-api-id "$GATEWAY_ID" \
--resource-id "$AWS_GATEWAY_LAMBDA_RESOURCE_ID" \
--http-method POST \
--authorization-type "NONE"
# --authorization-type "NONE" -- not secured, advanced users may secure at their own by this documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-settings-method-request.html#setup-method-request-authorization
```

```bash
aws apigateway put-integration \
--rest-api-id "$GATEWAY_ID" \
--resource-id "$AWS_GATEWAY_LAMBDA_RESOURCE_ID" \
--http-method POST \
--type AWS \
--integration-http-method POST \
--uri arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDAARN}/invocations
```

```bash
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

explain what the preprocessing script is and how to access it and deal with it (it will be publicly hosted)


Show that sagemaker is running with AWS CLI 
Sagemaker output goes to one of the S3 buckets into a specific folder / prefix 

## What to do with stuff

## Lessons Learned / Conclusion / Next Steps / Takeaways 

SEO keywords and stuff -- put other pipeline names or other tools that have ML pipelines





- Trigger updates to versioned datasets in Pachyderm or DVC.
- Set up an active learning workflow based on frequently-updated data annotations.
- Notify annotators about a new labeling project.
- Start training a machine learning model after a certain number of tasks have been annotated.
- Model monitoring / evaluation / metrics and stuff
