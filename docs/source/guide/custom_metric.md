---
title: Add a custom agreement metric to Label Studio
short: Custom agreement metric
tier: enterprise
type: guide
order: 0
order_enterprise: 310
meta_title: Add a Custom Agreement Metric for Labeling
meta_description: Label Studio Enterprise documentation about how to add a custom agreement metric to use for assessing annotator agreement or the quality of your annotation and prediction results for data labeling and machine learning projects.
section: "Review & Measure Quality"

---

Write a custom agreement metric to assess the quality of the predictions and annotations in your Label Studio Enterprise project. Label Studio Enterprise contains a variety of [agreement metrics for your project](stats.html) but if you want to evaluate annotations using a custom metric or a standard metric not available in Label Studio, you can write your own. 

This functionality is only available for Label Studio Enterprise Cloud customers, or for [customers running Label Studio Enterprise in a private cloud](#Set-up-permissions-for-a-private-cloud-custom-agreement-metric) with Amazon Web Services Elastic Compute Cluster [(AWS EC2)](https://aws.amazon.com/ec2/) or Amazon Elastic Kubernetes Service [(EKS)](https://aws.amazon.com/eks/).


Label Studio Enterprise Edition includes various annotation and labeling statistics and the ability to add your own. The open source Community Edition of Label Studio does not contain these calculations. If you're using Label Studio Community Edition, see <a href="https://labelstud.io/guide/label_studio_compare.html">Label Studio Features</a> to learn more.


1. Review the [prerequisites](#Prerequisites).
2. [Write your custom agreement metric](#How-to-write-your-custom-agreement-metric).
3. [Add your custom agreement metric to Label Studio Enterprise](#Add-your-custom-agreement-metric-to-Label-Studio-Enterprise).


## Prerequisites

If you're adding your custom agreement metric to Label Studio Enterprise hosted in a private (self-managed) AWS EC2 or AWS EKS instance, [set up permissions](#Set-up-permissions-for-a-private-cloud-custom-agreement-metric).

Before writing your custom agreement metric, do the following:
1. Determine the type of labeling that you're performing based on your labeling configuration.
2. Review the JSON format of your annotations for your labeling project.

## How to write your custom agreement metric

Based on the type of labeling that you're performing, write a custom agreement metric. 

You can use the agreement metric to compare two annotations, or one annotation with one prediction. Use the input parameters `annotation_1` and `annotation_2` to specify the annotations to compare, or annotation and prediction to compare. 

Add your code to the following function defined in Label Studio:
```python
def agreement(annotation_1, annotation_2, per_label=False) -> float:
```

This function takes the following arguments:

| argument | format | description |
| --- | --- | --- |
| `annotation_1` | JSON object | The first annotation or prediction to compare when calculating agreement. Retrieved in [Label Studio JSON format](export.html#Label-Studio-JSON-format-of-annotated-tasks). |
| `annotation_2` | JSON object | The second annotation or prediction to compare when calculating agreement. Retrieved in [Label Studio JSON format](export.html#Label-Studio-JSON-format-of-annotated-tasks).
| `per_label` | boolean | Whether to perform an agreement calculation for each label in the annotation, or across the entire annotation result.  |
| `return` | float | The agreement score to assign, as a float point number between 0 and 1. |

For example, the following agreement metric compares two annotations for a classification task with choice options of "Positive" and "Negative":
```python
def agreement(annotation_1, annotation_2, per_label=False) -> float:

    # Retrieve two annotations in the Label Studio JSON format
    r1 = annotation_1["result"][0]["value"]["choices"][0][0]
    r2 = annotation_2["result"][0]["value"]["choices"][0][0]
    
    # Determine annotation agreement based on specific choice values
    if r1 == r2:
        # If annotations match and include the choice "Positive", return an agreement score of 0.99
        if r1 == "Positive":
            return 0.99
        # If annotations match and include the choice "Negative", return an agreement score of 0.7
        if r1 == "Negative":
            return 0.7
    # If annotations do not match, return an agreement score of 0
    else:
        return 0
```

If you set `per_label=True`, you can define a separate method or agreement score for each label. If you do this, you must return a separate score for each label. For example, for a classification task, you could use the following function to assign a weight and return a specific agreement score for each label used in an annotation:

```python
def agreement(annotation_1, annotation_2, per_label=False) -> float:

    label_1 = annotation_1["result"][0]["value"]["choices"][0][0]
    label_2 = annotation_2["result"][0]["value"]["choices"][0][0]
    weight = {"Positive": 0.99, "Negative": 0.01}
    
    if label_1 == label_2:
        if per_label:
            return {label_1: weight[label_1]}
        else:
            return weight[label_1]
    else:
        if per_label:
            return {label_1: 0, label_2: 0}
        else:
            return 0
```

## Add your custom agreement metric to Label Studio Enterprise

Set up a custom agreement metric for a specific project in Label Studio Enterprise. 

!!! note 
    You must configure the labeling interface before you can add your custom agreement metric. 

!!! attention "important"
        [Using tags on Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/configuration-tags.html) is an on-premise only feature.
    

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Quality**.
3. Under **Annotation Agreement**:
    - **Metric name**: Use the drop-down menu to select **Custom agreement metric**.
    - **Lambda Tags**: Add tags to AWS Lambda function using the syntax `tag_name tag_value`.
    - **Lambda Prefix**: Select a Prefix.
4. Write or paste code defining a custom agreement metric in the text box. 
5. Click **Save & Deploy**.

For information on troubleshooting custom metrics, see [Troubleshooting Agreements & Quality Control](https://support.humansignal.com/hc/en-us/sections/23700954373261-Agreements-Quality-Control) in the HumanSignal support center.

## Set up permissions for a private cloud custom agreement metric

If you have Label Studio Enterprise deployed in a private cloud (self-managed) Amazon Web Services (AWS) Elastic Compute Cluster (EC2) instance or Amazon Elastic Kubernetes Service (EKS), you must grant additional permissions so that Label Studio Enterprise can run custom agreement metrics in AWS Lambda. 

To set up the permissions, do the following: 
1. [Create an AWS IAM role](#Create-an-AWS-IAM-role-for-logging) to be used by the custom metric Lambda functions to store logs in Cloudwatch 
2. Set up permissions that grant access to AWS Lambda. How you do this depends on your deployment scenario:
   - [Deployed with Docker Compose running in EC2](#Deployed-with-Docker-Compose-running-in-EC2).
   - [Deployed in EKS with an OIDC provider](#Deployed-in-EKS-with-an-OIDC-provider).
   - [Deployed in EKS without an OIDC provider](#Deployed-in-EKS-without-an-OIDC-provider).

You must know the AWS account ID for the AWS account that you use to manage Label Studio Enterprise to perform these steps. 

### Create an AWS IAM role for logging

Using your preferred method, create an AWS IAM role. 

1. Create an AWS IAM role named `LSE_CustomMetricsExecuteRole`. Follow the steps to create a role to delegate permissions to an AWS service in the AWS Identity and Access Management documentation for [Creating a role for an AWS service (console)](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html#roles-creatingrole-service-console).
2. Whether you create the role using the console or the AWS CLI, create or attach the following IAM policy to allow the role to store logs in Cloudwatch. Replace `YOUR_AWS_ACCOUNT` with your AWS account ID that has access to Label Studio Enterprise.
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "logs:CreateLogGroup",
            "Resource": "arn:aws:logs:*:YOUR_AWS_ACCOUNT:*"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:*:YOUR_AWS_ACCOUNT:log-group:/aws/lambda/custom-metric-*"
            ]
        }
    ]
}
```

### Set up permissions to allow Label Studio Enterprise to interact with AWS Lambda

After creating an IAM role to manage logs for the custom agreement metric, set up permissions to allow Label Studio Enterprise to interact with AWS Lambda. 

How you set up permissions depends on how you deployed Label Studio Enterprise in your self-managed cloud infrastructure:
- [Deployed with Docker Compose running in EC2](#Deployed-with-Docker-Compose-running-in-EC2)
- [Deployed in EKS with an OIDC provider](#Deployed-in-EKS-with-an-OIDC-provider)
- [Deployed in EKS without an OIDC provider](#Deployed-in-EKS-without-an-OIDC-provider)

### Deployed with Docker Compose running in EC2

If you deployed Label Studio Enterprise using Docker Compose in an AWS EC2 instance, do the following to finish setting up permissions for the custom agreement metric functionality:
1. Follow the AWS documentation steps for [Creating an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) to create an IAM user with programmatic access. This type of user is granted an access key to access AWS services.
2. While creating the IAM user, for the **Set permissions** option, choose to **Attach existing policies directly**.
3. Select **Create policy** and attach the [`LSE_AllowInteractLambda` policy](#Create-an-IAM-policy-to-grant-AWS-Lambda-permissions).
4. When you finish creating the user, save the username and access key somewhere secure.
5. In the `docker-compose.yaml` file that you use to deploy Label Studio Enterprise, add the following environment variables in the `app` and `rqworkers` sections:

!!! attention "important" 
    Update:
    - `YOUR_AWS_ACCESS_KEY_ID`, `YOUR_AWS_SECRET_ACCESS_KEY` and `YOUR_AWS_ACCOUNT` with the credentials for the account created in step 1. 
    - `YOUR_AWS_REGION` with the AWS region that your EC2 instance exists in the following:
```
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
LS_LAMBDA_REGION_CUSTOM_METRICS=YOUR_AWS_REGION
LS_LAMBDA_ROLE_CUSTOM_METRICS=arn:aws:iam::YOUR_AWS_ACCOUNT:role/LSE_CustomMetricsExecuteRole
```

After you set up these permissions in your environment, you're ready to write your custom agreement metric and add it to Label Studio Enterprise:
1. [Write your custom agreement metric](#How-to-write-your-custom-agreement-metric).
2. [Add your custom agreement metric to Label Studio Enterprise](#Add-your-custom-agreement-metric-to-Label-Studio-Enterprise).

### Deployed in EKS with an OIDC provider

If you deployed Label Studio Enterprise in Amazon Elastic Kubernetes Service (EKS) with OpenID Connect (OIDC) for identity and access management (IAM), do the following to finish setting up permissions for the custom agreement metric functionality:
1. Create an AWS IAM role named `LSE_ServiceAccountApp` following the steps to create a role to delegate permissions to an AWS service in the AWS Identity and Access Management documentation for [Creating a role for an AWS service (console)](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html#roles-creatingrole-service-console).
2. When relevant, attach the [`LSE_AllowInteractLambda` policy](#Create-an-IAM-policy-to-grant-AWS-Lambda-permissions) to the `LSE_ServiceAccountApp` role. 
3. Update your helm `values.yaml` file to include the following map. Replace `YOUR_AWS_ACCOUNT` with your AWS account ID:
```yaml
app:
  serviceAccount:
    annotations: 
      eks.amazonaws.com/role-arn: arn:aws:iam::YOUR_AWS_ACCOUNT:role/LSE_ServiceAccountApp
```
4. [Restart your Helm release](install_enterprise_k8s.html#Restart-Label-Studio-Enterprise-using-Helm).
   
After you set up these permissions in your environment, you're ready to write your custom agreement metric and add it to Label Studio Enterprise:
1. [Write your custom agreement metric](#How-to-write-your-custom-agreement-metric).
2. [Add your custom agreement metric to Label Studio Enterprise](#Add-your-custom-agreement-metric-to-Label-Studio-Enterprise).

### Deployed in EKS without an OIDC provider

If you deployed Label Studio Enterprise in Amazon Elastic Kubernetes Service (EKS) and are not using OpenID Connect (OIDC) for identity and access management (IAM), do the following to finish setting up permissions for the custom agreement metric functionality:
1. In the AWS console UI, go to **EKS > Clusters > YOUR_CLUSTER_NAME > Node Group**.
2. Select the name of **YOUR_NODE_GROUP** with Label Studio Enterprise deployed.
3. On the **Details** page, locate and select the option for **Node IAM Role ARN**.
4. Create the AWS IAM policy [`LSE_AllowInteractLambda`](#Create-an-IAM-policy-to-grant-AWS-Lambda-permissions).
5. [Restart your Helm release](install_enterprise_k8s.html#Restart-Label-Studio-Enterprise-using-Helm).
   
After you set up these permissions in your environment, you're ready to write your custom agreement metric and add it to Label Studio Enterprise:
1. [Write your custom agreement metric](#How-to-write-your-custom-agreement-metric).
2. [Add your custom agreement metric to Label Studio Enterprise](#Add-your-custom-agreement-metric-to-Label-Studio-Enterprise).

### Create an IAM policy to grant AWS Lambda permissions

To grant permissions to a specific user, role, or EKS node group used to manage Label Studio Enterprise access to interact with AWS Lambda, use the following IAM policy. Create an IAM policy called `LSE_AllowInteractLambda` and replace `YOUR_AWS_ACCOUNT` with your AWS account ID:
```json
{
   "Version": "2012-10-17",
   "Statement": [
      {
         "Sid": "VisualEditor0",
         "Effect": "Allow",
         "Action": "iam:PassRole",
         "Resource": "arn:aws:iam::YOUR_AWS_ACCOUNT:role/LSE_CustomMetricsExecuteRole"
      },
      {
         "Sid": "VisualEditor1",
         "Effect": "Allow",
         "Action": [
            "lambda:CreateFunction",
            "lambda:UpdateFunctionCode",
            "lambda:InvokeFunction",
            "lambda:GetFunction",
            "lambda:DeleteFunction",
            "lambda:TagResource",
            "lambda:ListTags"
         ],
         "Resource": [
            "arn:aws:lambda:*:YOUR_AWS_ACCOUNT:function:custom-metric-*"
         ]
      },
      {
         "Sid": "VisualEditor2",
         "Effect": "Allow",
         "Action": "lambda:ListFunctions",
         "Resource": "*"
      },
      {
         "Action": [
            "logs:StartQuery",
            "logs:GetQueryResults"
         ],
         "Effect": "Allow",
         "Resource": [
            "arn:aws:logs:*:YOUR_AWS_ACCOUNT:log-group:/aws/lambda/custom-metric-*"
         ]
      }
   ]
}
```
