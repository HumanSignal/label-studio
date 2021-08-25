---
title: Retrain your Amazon Sagemaker model automatically with Label Studio and Webhooks
type: blog
order: 90
image: /images/webhook-blog/stylized-diagram.png
meta_title: 
meta_description: Use webhooks from open source data labeling software Label Studio to seamlessly integrate your AWS Lambda and Amazon Sagemaker model development pipeline for your machine learning and data science projects.
---

Retrain your Amazon Sagemaker model automatically with Label Studio and Webhooks
OR Automatically retrain machine learning models with Amazon Sagemaker, Label Studio, and webhooks
OR Upgrade your SageMaker model training pipeline with Label Studio
OR Fly through retraining your image segmentation model: An example with Label Studio, webhooks, Amazon AWS Lambda, and Amazon SageMaker




You might want to retrain your Amazon SageMaker model to improve its handling of specific corner cases, but you have complex labeling scenarios that mean you can't use the Ground Truth labeling service.  



If you need to relabel the data or otherwise improve your model in Amazon SageMaker, you can use Label Studio. 



If you want to continually retrain your model as annotators identify birds in photos, and then test the quality of the updated models. 







If you have a machine learning pipeline, or retrain your models frequently based on newly-annotated data, you know that it can be challenging to automate that process. Now that Label Studio supports webhooks, you can automatically receive updates every time a new annotation is created or a project is updated to include different labels. 

WHY WEBHOOKS

This blog post walks you through an example of using webhooks with Label Studio to trigger specific actions in your existing machine learning pipeline. 


<br/><img src="/images/webhook-blog/stylized-diagram.png" alt="" class="gif-border" width="800px" height="" />


In this example, train an image segmentation model to recognize birds based on the various parts of birds that might be visible in an image. 

<br/><img src="/images/webhook-blog/detailed-diagram.png" alt="" class="gif-border" width="800px" height="" />

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

After you prepare your datasets 

## Set up your model in Amazon SageMaker



...The preprocessing script creates additional prefixes to manage the data and deletes those after the model retrains. 


### SageMaker Pipeline


Set up an IAM policy for SageMaker. 

From the command line, set up the policy and then create a role that uses this policy: 

<br/>

{% details <b>Click to expand the role policy for the Amazon SageMaker pipeline</b> %}

Copy and save this policy as a JSON file and reference it when you apply it to the role. 

{% codeblock lang:json %}

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sagemaker:*"
      ],
      "NotResource": [
        "arn:aws:sagemaker:*:*:domain/*",
        "arn:aws:sagemaker:*:*:user-profile/*",
        "arn:aws:sagemaker:*:*:app/*",
        "arn:aws:sagemaker:*:*:flow-definition/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sagemaker:CreatePresignedDomainUrl",
        "sagemaker:DescribeDomain",
        "sagemaker:ListDomains",
        "sagemaker:DescribeUserProfile",
        "sagemaker:ListUserProfiles",
        "sagemaker:*App",
        "sagemaker:ListApps"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "sagemaker:*",
      "Resource": [
        "arn:aws:sagemaker:*:*:flow-definition/*"
      ],
      "Condition": {
        "StringEqualsIfExists": {
          "sagemaker:WorkteamType": [
            "private-crowd",
            "vendor-crowd"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "application-autoscaling:DeleteScalingPolicy",
        "application-autoscaling:DeleteScheduledAction",
        "application-autoscaling:DeregisterScalableTarget",
        "application-autoscaling:DescribeScalableTargets",
        "application-autoscaling:DescribeScalingActivities",
        "application-autoscaling:DescribeScalingPolicies",
        "application-autoscaling:DescribeScheduledActions",
        "application-autoscaling:PutScalingPolicy",
        "application-autoscaling:PutScheduledAction",
        "application-autoscaling:RegisterScalableTarget",
        "aws-marketplace:ViewSubscriptions",
        "cloudformation:GetTemplateSummary",
        "cloudwatch:DeleteAlarms",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics",
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:PutMetricData",
        "codecommit:BatchGetRepositories",
        "codecommit:CreateRepository",
        "codecommit:GetRepository",
        "codecommit:List*",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminDisableUser",
        "cognito-idp:AdminEnableUser",
        "cognito-idp:AdminRemoveUserFromGroup",
        "cognito-idp:CreateGroup",
        "cognito-idp:CreateUserPool",
        "cognito-idp:CreateUserPoolClient",
        "cognito-idp:CreateUserPoolDomain",
        "cognito-idp:DescribeUserPool",
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:List*",
        "cognito-idp:UpdateUserPool",
        "cognito-idp:UpdateUserPoolClient",
        "ec2:CreateNetworkInterface",
        "ec2:CreateNetworkInterfacePermission",
        "ec2:CreateVpcEndpoint",
        "ec2:DeleteNetworkInterface",
        "ec2:DeleteNetworkInterfacePermission",
        "ec2:DescribeDhcpOptions",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DescribeRouteTables",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSubnets",
        "ec2:DescribeVpcEndpoints",
        "ec2:DescribeVpcs",
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CreateRepository",
        "ecr:Describe*",
        "ecr:GetAuthorizationToken",
        "ecr:GetDownloadUrlForLayer",
        "ecr:StartImageScan",
        "elastic-inference:Connect",
        "elasticfilesystem:DescribeFileSystems",
        "elasticfilesystem:DescribeMountTargets",
        "fsx:DescribeFileSystems",
        "glue:CreateJob",
        "glue:DeleteJob",
        "glue:GetJob*",
        "glue:GetTable*",
        "glue:GetWorkflowRun",
        "glue:ResetJobBookmark",
        "glue:StartJobRun",
        "glue:StartWorkflowRun",
        "glue:UpdateJob",
        "groundtruthlabeling:*",
        "iam:ListRoles",
        "kms:DescribeKey",
        "kms:ListAliases",
        "lambda:ListFunctions",
        "logs:CreateLogDelivery",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DeleteLogDelivery",
        "logs:Describe*",
        "logs:GetLogDelivery",
        "logs:GetLogEvents",
        "logs:ListLogDeliveries",
        "logs:PutLogEvents",
        "logs:PutResourcePolicy",
        "logs:UpdateLogDelivery",
        "robomaker:CreateSimulationApplication",
        "robomaker:DescribeSimulationApplication",
        "robomaker:DeleteSimulationApplication",
        "robomaker:CreateSimulationJob",
        "robomaker:DescribeSimulationJob",
        "robomaker:CancelSimulationJob",
        "secretsmanager:ListSecrets",
        "servicecatalog:Describe*",
        "servicecatalog:List*",
        "servicecatalog:ScanProvisionedProducts",
        "servicecatalog:SearchProducts",
        "servicecatalog:SearchProvisionedProducts",
        "sns:ListTopics",
        "tag:GetResources"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:SetRepositoryPolicy",
        "ecr:CompleteLayerUpload",
        "ecr:BatchDeleteImage",
        "ecr:UploadLayerPart",
        "ecr:DeleteRepositoryPolicy",
        "ecr:InitiateLayerUpload",
        "ecr:DeleteRepository",
        "ecr:PutImage"
      ],
      "Resource": [
        "arn:aws:ecr:*:*:repository/*sagemaker*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GitPush"
      ],
      "Resource": [
        "arn:aws:codecommit:*:*:*sagemaker*",
        "arn:aws:codecommit:*:*:*SageMaker*",
        "arn:aws:codecommit:*:*:*Sagemaker*"
      ]
    },
    {
      "Action": [
        "codebuild:BatchGetBuilds",
        "codebuild:StartBuild"
      ],
      "Resource": [
        "arn:aws:codebuild:*:*:project/sagemaker*",
        "arn:aws:codebuild:*:*:build/*"
      ],
      "Effect": "Allow"
    },
    {
      "Action": [
        "states:DescribeExecution",
        "states:GetExecutionHistory",
        "states:StartExecution",
        "states:StopExecution",
        "states:UpdateStateMachine"
      ],
      "Resource": [
        "arn:aws:states:*:*:statemachine:*sagemaker*",
        "arn:aws:states:*:*:execution:*sagemaker*:*"
      ],
      "Effect": "Allow"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:DescribeSecret",
        "secretsmanager:GetSecretValue",
        "secretsmanager:CreateSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:AmazonSageMaker-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:DescribeSecret",
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "secretsmanager:ResourceTag/SageMaker": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "servicecatalog:ProvisionProduct"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "servicecatalog:TerminateProvisionedProduct",
        "servicecatalog:UpdateProvisionedProduct"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "servicecatalog:userLevel": "self"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "*",
      "Condition": {
        "StringEqualsIgnoreCase": {
          "s3:ExistingObjectTag/SageMaker": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/servicecatalog:provisioning": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:ListAllMyBuckets",
        "s3:GetBucketCors",
        "s3:PutBucketCors"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketAcl",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::*SageMaker*",
        "arn:aws:s3:::*Sagemaker*",
        "arn:aws:s3:::*sagemaker*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": [
        "arn:aws:lambda:*:*:function:*SageMaker*",
        "arn:aws:lambda:*:*:function:*sagemaker*",
        "arn:aws:lambda:*:*:function:*Sagemaker*",
        "arn:aws:lambda:*:*:function:*LabelingFunction*"
      ]
    },
    {
      "Action": "iam:CreateServiceLinkedRole",
      "Effect": "Allow",
      "Resource": "arn:aws:iam::*:role/aws-service-role/sagemaker.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_SageMakerEndpoint",
      "Condition": {
        "StringLike": {
          "iam:AWSServiceName": "sagemaker.application-autoscaling.amazonaws.com"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "iam:CreateServiceLinkedRole",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "iam:AWSServiceName": "robomaker.amazonaws.com"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Subscribe",
        "sns:CreateTopic"
      ],
      "Resource": [
        "arn:aws:sns:*:*:*SageMaker*",
        "arn:aws:sns:*:*:*Sagemaker*",
        "arn:aws:sns:*:*:*sagemaker*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::*:role/*AmazonSageMaker*",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": [
            "glue.amazonaws.com",
            "robomaker.amazonaws.com",
            "states.amazonaws.com"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::*:role/*",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "sagemaker.amazonaws.com"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "athena:ListDataCatalogs",
        "athena:ListDatabases",
        "athena:ListTableMetadata",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "athena:StartQueryExecution",
        "athena:StopQueryExecution"
      ],
      "Resource": [
        "*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:CreateTable"
      ],
      "Resource": [
        "arn:aws:glue:*:*:table/*/sagemaker_tmp_*",
        "arn:aws:glue:*:*:table/sagemaker_featurestore/*",
        "arn:aws:glue:*:*:catalog",
        "arn:aws:glue:*:*:database/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:DeleteTable"
      ],
      "Resource": [
        "arn:aws:glue:*:*:table/*/sagemaker_tmp_*",
        "arn:aws:glue:*:*:catalog",
        "arn:aws:glue:*:*:database/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:GetDatabases",
        "glue:GetTable",
        "glue:GetTables"
      ],
      "Resource": [
        "arn:aws:glue:*:*:table/*",
        "arn:aws:glue:*:*:catalog",
        "arn:aws:glue:*:*:database/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:CreateDatabase",
        "glue:GetDatabase"
      ],
      "Resource": [
        "arn:aws:glue:*:*:catalog",
        "arn:aws:glue:*:*:database/sagemaker_featurestore",
        "arn:aws:glue:*:*:database/sagemaker_processing",
        "arn:aws:glue:*:*:database/default",
        "arn:aws:glue:*:*:database/sagemaker_data_wrangler"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "redshift-data:ExecuteStatement",
        "redshift-data:DescribeStatement",
        "redshift-data:CancelStatement",
        "redshift-data:GetStatementResult",
        "redshift-data:ListSchemas",
        "redshift-data:ListTables"
      ],
      "Resource": [
        "*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "redshift:GetClusterCredentials"
      ],
      "Resource": [
        "arn:aws:redshift:*:*:dbuser:*/sagemaker_access*",
        "arn:aws:redshift:*:*:dbname:*"
      ]
    }
  ]
}

{% endcodeblock %}
{% enddetails %}
<br/>



From the command line, run the following:
```bash
ROLE_ARN=$(aws iam create-role \
    --role-name SageMaker-Role \
    --assume-role-policy-document file://sage_policy.json \
    --output text \
    --query 'Role.Arn')
```

NEED TO CHANGE THE POLICY DOCUMENT FOR THIS ROLE TO ONE THAT IS FOR USERS AND HAS A PRINCIPAL

Then, apply a role policy to the role that you created: 
```bash
aws iam put-role-policy --role-name SageMaker-Role --policy-name SM-Pipeline --policy-document file://sage_policy.json
```

Then, retrieve the RoleArn of the role that you just created:
```bash
echo $ROLE_ARN
```


### Create a SageMaker pipeline

WORDS ABOUT SAGEMAKER PIPELINE


<br/>

{% details <b>Click to expand the pipeline definition</b> %}
Update this example Amazon SageMaker pipeline definition with the RoleArn of the SageMaker role that you set up in previous steps. $SageMakerRoleArn

{% codeblock lang:json %}

{
	"PipelineName": "WebhookShowcase",
	"PipelineDisplayName": "WebhookShowcase",
	"RoleArn": "$SageMakerRoleArn",
	"PipelineDefinition": "{\"Version\": \"2020-12-01\", \"Metadata\": {}, \"Parameters\": [{\"Name\": \"ProcessingInstanceType\", \"Type\": \"String\", \"DefaultValue\": \"ml.m5.xlarge\"}, {\"Name\": \"ProcessingInstanceCount\", \"Type\": \"Integer\", \"DefaultValue\": 1}, {\"Name\": \"TrainingInstanceType\", \"Type\": \"String\", \"DefaultValue\": \"ml.m5.xlarge\"}, {\"Name\": \"ModelApprovalStatus\", \"Type\": \"String\", \"DefaultValue\": \"PendingManualApproval\"}], \"PipelineExperimentConfig\": {\"ExperimentName\": {\"Get\": \"Execution.PipelineName\"}, \"TrialName\": {\"Get\": \"Execution.PipelineExecutionId\"}}, \"Steps\": [{\"Name\": \"ProcessingStepWebhook\", \"Type\": \"Processing\", \"Arguments\": {\"ProcessingResources\": {\"ClusterConfig\": {\"InstanceType\": \"ml.m5.xlarge\", \"InstanceCount\": 1, \"VolumeSizeInGB\": 30}}, \"AppSpecification\": {\"ImageUri\": \"257758044811.dkr.ecr.us-east-2.amazonaws.com/sagemaker-scikit-learn:0.20.0-cpu-py3\", \"ContainerArguments\": [\"--train-test-split-ratio\", \"20\"], \"ContainerEntrypoint\": [\"python3\", \"/opt/ml/processing/input/code/aws-preprocessing.py\"]}, \"RoleArn\": \"ROLE_FOR_SAGEMAKER_PIPELINE\", \"ProcessingInputs\": [{\"InputName\": \"input-1\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"S3://showcase-bucket/annotations/\", \"LocalPath\": \"/opt/ml/processing/input/raw\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}, {\"InputName\": \"input-2\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"S3://showcase-bucket/bird-images/\", \"LocalPath\": \"/opt/ml/processing/input/train\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}, {\"InputName\": \"code\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"s3://showcase-bucket/script/aws-preprocessing.py\", \"LocalPath\": \"/opt/ml/processing/input/code\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}], \"ProcessingOutputConfig\": {\"Outputs\": [{\"OutputName\": \"train_1\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://showcase-bucket/temp/train\", \"LocalPath\": \"/opt/ml/processing/output/train_1\", \"S3UploadMode\": \"EndOfJob\"}}, {\"OutputName\": \"train_1_annotation\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://showcase-bucket/temp/train_annotation\", \"LocalPath\": \"/opt/ml/processing/output/train_1_annotation\", \"S3UploadMode\": \"EndOfJob\"}}, {\"OutputName\": \"val_annotation\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://showcase-bucket/temp/validation_annotation\", \"LocalPath\": \"/opt/ml/processing/output/validation_annotation\", \"S3UploadMode\": \"EndOfJob\"}}, {\"OutputName\": \"val_data\", \"AppManaged\": false, \"S3Output\": {\"S3Uri\": \"S3://showcase-bucket/temp/validation\", \"LocalPath\": \"/opt/ml/processing/output/validation\", \"S3UploadMode\": \"EndOfJob\"}}]}}}, {\"Name\": \"ImageSegmentationTrain\", \"Type\": \"Training\", \"Arguments\": {\"AlgorithmSpecification\": {\"TrainingInputMode\": \"File\", \"TrainingImage\": \"825641698319.dkr.ecr.us-east-2.amazonaws.com/semantic-segmentation:1\"}, \"OutputDataConfig\": {\"S3OutputPath\": \"S3://showcase-bucket/output/\"}, \"StoppingCondition\": {\"MaxRuntimeInSeconds\": 36000}, \"ResourceConfig\": {\"InstanceCount\": 1, \"InstanceType\": \"ml.p3.2xlarge\", \"VolumeSizeInGB\": 100}, \"RoleArn\": \"ROLE_FOR_SAGEMAKER_PIPELINE\", \"InputDataConfig\": [{\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://showcase-bucket/temp/train\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"train\"}, {\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://showcase-bucket/temp/validation\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"validation\"}, {\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://showcase-bucket/temp/train_annotation\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"train_annotation\"}, {\"DataSource\": {\"S3DataSource\": {\"S3DataType\": \"S3Prefix\", \"S3Uri\": \"S3://showcase-bucket/temp/validation_annotation\", \"S3DataDistributionType\": \"FullyReplicated\"}}, \"ContentType\": \"application/x-image\", \"ChannelName\": \"validation_annotation\"}], \"HyperParameters\": {\"backbone\": \"resnet-50\", \"algorithm\": \"fcn\", \"use_pretrained_model\": \"True\", \"num_classes\": \"4\", \"epochs\": \"10\", \"learning_rate\": \"0.0001\", \"optimizer\": \"rmsprop\", \"lr_scheduler\": \"poly\", \"mini_batch_size\": \"2\", \"validation_mini_batch_size\": \"2\"}, \"ProfilerRuleConfigurations\": [{\"RuleConfigurationName\": \"ProfilerReport-1629795191\", \"RuleEvaluatorImage\": \"915447279597.dkr.ecr.us-east-2.amazonaws.com/sagemaker-debugger-rules:latest\", \"RuleParameters\": {\"rule_to_invoke\": \"ProfilerReport\"}}], \"ProfilerConfig\": {\"S3OutputPath\": \"S3://showcase-bucket/output/\"}}, \"DependsOn\": [\"ProcessingStepWebhook\"]}, {\"Name\": \"CleanupStepWebhook\", \"Type\": \"Processing\", \"Arguments\": {\"ProcessingResources\": {\"ClusterConfig\": {\"InstanceType\": \"ml.m5.xlarge\", \"InstanceCount\": 1, \"VolumeSizeInGB\": 30}}, \"AppSpecification\": {\"ImageUri\": \"257758044811.dkr.ecr.us-east-2.amazonaws.com/sagemaker-scikit-learn:0.20.0-cpu-py3\", \"ContainerArguments\": [\"--s3_validation_annotation_path\", \"S3://showcase-bucket/temp/validation_annotation\", \"--s3_validation_path\", \"S3://showcase-bucket/temp/validation\", \"--s3_train_annotation_path\", \"S3://showcase-bucket/temp/train_annotation\", \"--s3_train_path\", \"S3://showcase-bucket/temp/train\"], \"ContainerEntrypoint\": [\"python3\", \"/opt/ml/processing/input/code/aws-cleanup.py\"]}, \"RoleArn\": \"ROLE_FOR_SAGEMAKER_PIPELINE\", \"ProcessingInputs\": [{\"InputName\": \"code\", \"AppManaged\": false, \"S3Input\": {\"S3Uri\": \"s3://label-studio-testdata/preprocessing/aws-cleanup.py\", \"LocalPath\": \"/opt/ml/processing/input/code\", \"S3DataType\": \"S3Prefix\", \"S3InputMode\": \"File\", \"S3DataDistributionType\": \"FullyReplicated\", \"S3CompressionType\": \"None\"}}]}, \"DependsOn\": [\"ImageSegmentationTrain\"]}]}"
} 

{% endcodeblock %}

{% enddetails %}
<br/>

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


CREATE AN ENDPOINT FOR THE MODEL???

## Set up AWS Lambda function 

- here's what the lambda function does
  > lambda function counts the number of annotations created and prompts retraining after 16 annotations have been completed (a "ready to train" checkpoint of sorts)
- here's why to do that (????)

make decisions
- set up a checkpoint of number of annotations after which to start retraining the model
  (here's why to pick this number, and how long it will take to retrain the model with that number)

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

Then attach the policy to the role that will be running the Lambda function: 
```bash
aws iam attach-role-policy --role-name LsCustomWebhook --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

Define the policy needed to allow the Lambda function to invoke the SageMaker endpoint for the pipeline that you created with your model:
```bash
POLICY=$(echo -n '{"Version":"2012-10-17","Statement":[{"Sid":"VisualEditor0","Effect":"Allow","Action":["sagemaker:StartPipelineExecution","sagemaker:InvokeEndpoint"],"Resource":"*"}]}')
```

Create the policy: 
```bash
POLICY_ARN=$(aws iam create-policy \
    --policy-name AllowSmInvokeEndpoint \
    --policy-document "$POLICY" \
    --output text \
    --query 'Policy.Arn')
```

Attach the policy to the role that runs the lambda function: 
```bash
aws iam attach-role-policy --role-name LsCustomWebhook --policy-arn $POLICY_ARN
```

### Set up the Lambda function

First, download, save, and zip up the example AWS Lambda function that does the following:
- process the label studio ANNOTATION_CREATED event
- parses the body for the count of annotations created and the project details


update the pipeline name to match the pipeline that you created 

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

For every 16 annotations, the pipeline training begins / is fired


From the command line, run the following:
```bash
zip LsCustomWebhook.zip LsCustomWebhook.py
```

zip LsCustomWebhook2.zip lambda-sm.py

Create the function in AWS Lambda. From the command line, run the following:
```bash
aws lambda create-function --function-name LsCustomWebhookCheese --role $ROLE_ARN --runtime python3.8 --handler LsCustomWebhook.lambda_handler --zip-file fileb://LsCustomWebhook2.zip --region us-east-2
```

SUCCESS RETURNS THE FOLLOWING 
```json
{
    "FunctionName": "LsCustomWebhookChew",
    "FunctionArn": "arn:aws:lambda:us-east-2:490065312183:function:LsCustomWebhookChew",
    "Runtime": "python3.8",
    "Role": "arn:aws:iam::490065312183:role/LsCustomWebhookCheese",
    "Handler": "LsCustomWebhook.lambda_handler",
    "CodeSize": 506,
    "Description": "",
    "Timeout": 3,
    "MemorySize": 128,
    "LastModified": "2021-08-24T18:06:24.750+0000",
    "CodeSha256": "FjoAGE/xJEndCddHZOQKJxrtdRrT+khJbK//U2ESAV0=",
    "Version": "$LATEST",
    "TracingConfig": {
        "Mode": "PassThrough"
    },
    "RevisionId": "76bb8cfd-338e-4623-b73f-97f09455f393",
    "State": "Active",
    "LastUpdateStatus": "Successful",
    "PackageType": "Zip"
}


```


Update the function to specify the endpoint of the Sagemaker model.
From the command line, run the following:
```bash
aws lambda update-function-configuration --function-name LsCustomWebhook --environment Variables='{ENDPOINT_NAME="< SageMaker Endpoint Name >"}'
```


Then, store the ARN of the Lambda function as an environment variable so that the webhook function script can reference it. 
From the command line, run the following:
```bash
LAMBDAARN=$(aws lambda list-functions --query "Functions[?FunctionName==\`LsCustomWebhookCheese\`].FunctionArn" --output text) 
```

## Set up the Amazon API gateway 
to communicate across all the AWS services and stuff

> If you're using Amazon VPC, you can also use a VPC endpoint instead of the Amazon API gateway

Create an AWS Rest API gateway configuration. Set several environment variables and run several commands from the command line...

This example uses us-east-2 as a default region. If you're using a different AWS region, update the `REGION` environment variable to the AWS region that you're using. 

```bash
REGION=us-east-2
```

Set up an account ID for the gateway
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

Create an AWS Gateway ID: 
```bash
GATEWAY_ID=$(aws apigateway create-rest-api \
--name 'LsCustomWebhookGateway' | jq -r .id)
```

Create a root ID for the gateway (??):
```bash
GATEWAY_ROOT_ID=$(aws apigateway get-resources \
--rest-api-id "$GATEWAY_ID" | jq -r '.items[] | select(.path == "/").id')
```

```bash
AWS_GATEWAY_LAMBDA_RESOURCE_ID=$(aws apigateway create-resource \
--rest-api-id "$GATEWAY_ID" \
--parent-id "$GATEWAY_ROOT_ID" \
--path-part LcWebHook | jq -r .id)
```

Do some other things:
By default this example does not use authorization for the HTTP request, but you might want to secure your API Gatway configuration. See [Set up method request authorization](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-settings-method-request.html#setup-method-request-authorization) in the Amazon API Gateway documentation.
```bash
aws apigateway put-method \
--rest-api-id "$GATEWAY_ID" \
--resource-id "$AWS_GATEWAY_LAMBDA_RESOURCE_ID" \
--http-method POST \
--authorization-type "NONE"
```


DO SOMETHING ELSE WITH THE API GATEWAY, NOT SURE HOW THIS IS DIFFERENT 
```bash
aws apigateway put-integration \
--rest-api-id "$GATEWAY_ID" \
--resource-id "$AWS_GATEWAY_LAMBDA_RESOURCE_ID" \
--http-method POST \
--type AWS \
--integration-http-method POST \
--uri arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDAARN}/invocations
```

output
```json
{
    "type": "AWS",
    "httpMethod": "POST",
    "uri": "arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-2:490065312183:function:LsCustomWebhookCheese/invocations",
    "passthroughBehavior": "WHEN_NO_MATCH",
    "timeoutInMillis": 29000,
    "cacheNamespace": "lz0dor",
    "cacheKeyParameters": []
}
```

After performing the setup, create the Amazon API Gateway: 
```bash
aws apigateway create-deployment --rest-api-id $GATEWAY_ID --stage-name prod
```

```json
{
    "id": "had51b",
    "createdDate": "2021-08-24T11:22:18-07:00"
}
```

Add some additional permissions to the function to allow the API Gateway to run the lambda function: 
```bash
aws lambda add-permission --function-name LsCustomWebhook \
--statement-id apigateway-get --action lambda:InvokeFunction \
--principal apigateway.amazonaws.com \
--source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${GATEWAY_ID}/*/*/*"
```

```json
{
    "Statement": "{\"Sid\":\"apigateway-get\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"apigateway.amazonaws.com\"},\"Action\":\"lambda:InvokeFunction\",\"Resource\":\"arn:aws:lambda:us-east-2:490065312183:function:LsCustomWebhook\",\"Condition\":{\"ArnLike\":{\"AWS:SourceArn\":\"arn:aws:execute-api:us-east-2:490065312183:wru404i3oe/*/*/*\"}}}"
}
```



After you create the gateway, it becomes available at the following URL: `https://$GATEWAY_ID.execute-api.${REGION}.amazonaws.com/prod/LcWebHook`

run the following:
```bash
echo https://$GATEWAY_ID.execute-api.${REGION}.amazonaws.com/prod/LcWebHook
```

You'll use that URL as the webhook URL when you set those up in Label Studio later.

## set up label studio

- set up image segmentation project
  
1. Create the project
2. Name it Bird Identification
3. Skip importing data for now
4. Select the **Semantic Segmentation with Polygons** template. 
5. Update the labels to Beak, Head, Wing, and Body.
6. Save the project

SageMaker Model expects 4 classes 
- Beak
- Wing
- Head
- Body

   

1. Open the project settings
2. Select **Cloud Storage**.
3. Click **Add Source Storage**
4. Add a title for the storage, for example **Source bird images**
5. Specify the bucket name of **showcase-bucket** and a bucket prefix of **bird-images**
6. Use a file filter regex of `.*jpg`.
7. Specify a region name of `us-east-2` unless you're using a different region to follow along with this blog post.
8. SPECIFY AN ACCESS KEY ID AND SECRET ACCESS KEY FOR THE BUCKET? 
9. Click **Add Storage**.
10. Click **Sync** to sync the images.

As those are syncing, set up the target storage.
1. Click **Add Target Storage**
2. Add a title for the storage, for example **Annotated birds**
3. Specify the bucket name of **showcase-bucket** and a bucket prefix of **annotations**. 
4. Specify a region name of `us-east-2` unless you're using a different region to follow along with this blog post.
5. SPECIFY AN ACCESS KEY ID AND SECRET ACCESS KEY FOR THE BUCKET? 
6. Click **Add Storage**.

<br/><img src="/images/webhook-blog/stylized-diagram.png" alt="" class="gif-border" width="800px" height="" />



Add a webhook
1. Click **Webhooks**
2. Click **Add Webhook**.
3. In the **URL** field, paste the AWS API gateway URL that was created when you created the AWS API gateway. `https://$GATEWAY_ID.execute-api.${REGION}.amazonaws.com/prod/LcWebHook`
5. For **Payload**, leave **Send payload** selected, but deselect **Send for all actions**. You only want to send events to the AWS Lambda function when an annotation is created. For **Send Payload for**, select **Annotation created**. 
6. Click **Add Webhook** to save your changes.

<br/><img src="/images/webhook-blog/stylized-diagram.png" alt="" class="gif-border" width="800px" height="" />



## start annotating data in LS

After you set up the project, you can start labeling! 

Create polygons around bird pieces

start labeling!
- create annotations

Label at least 16 bird images to trigger the pipeline for training / retraining. 


<br/><img src="/images/webhook-blog/stylized-diagram.png" alt="" class="gif-border" width="800px" height="" />


<br/><img src="/images/webhook-blog/stylized-diagram.png" alt="" class="gif-border" width="800px" height="" />


<br/><img src="/images/webhook-blog/stylized-diagram.png" alt="" class="gif-border" width="800px" height="" />



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



