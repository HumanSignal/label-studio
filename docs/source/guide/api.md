---
title: API Reference for Label Studio
short: Backend API
type: guide
order: 704
meta_title: API Endpoints
meta_description: API documentation for authenticating, listing data science projects, importing predictions and raw data and exporting annotated data, and user management in Label Studio.
---

You can use the Label Studio API to import data for labeling, export annotations, set up machine learning with Label Studio, and sync tasks with cloud storage. 

See the [API reference documentation](/api) for further guidance and interactive examples. If you want to write Python scripts using the API, use the [Label Studio Python SDK](sdk.html). 

<div class="enterprise"><p>
The Label Studio Enterprise API shares many endpoints with the Label Studio Community Edition API, but includes extra payload options and additional endpoints specific to Enterprise features. Access the full Label Studio Enterprise API reference documentation by doing the following:</p>
<ol>
<li>Log in to Label Studio Enterprise</li>
<li>Open the menu and click <b>API</b></li>
</ol>
</div>

### Annotation
The output of a labeling task. Previously called "completions". 

See [API documentation for Annotation](/api#tag/Annotations).

### Authentication
[Authentication](auth_setup.html) is a security measure that determines whether someone or something is, in fact, who or what it declares to be. An authentication process implies the verification of a user token on the User Account page in Label Studio. Authentication often precedes authorization (although they may often seem to be combined). The two terms are often used synonymously, but they imply two different processes.

You must retrieve your access token so that you can authenticate to the API.

1. In the Label Studio UI, click the user icon in the upper right.
2. Click **Account & Settings**.
3. Copy the access token. 

In your first API call, specify the access token in the headers: 
```bash
curl -X <method> <Label Studio URL>/api/<endpoint> -H 'Authorization: Token <token>'
```

You can also retrieve the access token using the command line. 
1. From the command line, run the following: 
```bash
label-studio user --username <username>
```
2. In the output returned in your terminal, the token for the user is listed as part of the user info.  

See [API documentation for Authentication](/api#section/Authentication).

### Data Manager
The [data manager](https://labelstud.io/blog/label-studio-release-notes-0-9-0/) provides filters to narrow down what to label within a dataset. You can find samples with particular features, and when those features are present they can be labeled in a certain way.

See [API documentation for Data Manager](/api#tag/Data-Manager).

### Export
The [Export](api_migrate.html#Import-data) function returns annotated tasks as a file in a specific format. 

See [API documentation for Export](/api#tag/Export).

#### Export annotations
To export annotations, first see [which formats are available to export for your project](/api#operation/api_projects_export_formats_read). 

Choose your selected format from the response and then call the export endpoint. See the [export annotations](/api#operation/api_projects_export_read) endpoint documentation for more details.

### Import
The [Import](api_migrate.html#Import-data) function accepts data into Label Studio by importing files, referencing URLs, or syncing with cloud or database storage. 

See [API documentation for Import](/api#tag/Import).

#### Import tasks using the API
To import tasks using the API, make sure you know the project ID that you want to add tasks to. See additional examples and parameter descriptions in the [import data endpoint documentation](/api#operation/api_projects_import_create)

### Invites
[Invite](signup.html#Invite-collaborators-to-a-project) collaborators to Label Studio projects. 

See [API documentation for Invites](/api#tag/Invites).

### Labels
In machine learning, all types of data should have a [Label](labeling.html) with meaningful information for users to identify them easily. Labels provide context so that a machine learning model can learn from it quickly. 

See [API documentation for Labels](/api#tag/Labels).

### Machine Learning
Machine learning is a branch of AI and computer science which focuses on the use of data and algorithms to imitate the way that humans learn, gradually improving its accuracy.

See [API documentation for Machine Learning](/api#tag/Machine-Learning).

### Organizations
An [Organization](manage_users.html#Use-the-organization-page) is an entity which holds a set of zones for multiple users to interact with.

See [API documentation for Organizations](/api#tag/Organizations).

### Predictions
[Predictions](ml_create.html#Make-predictions-with-your-ML-backend) are the output of a program after it has been trained on a historical dataset and applied to new data when forecasting the likelihood of a particular outcome.

See [API documentation for Predictions](/api#tag/Predictions).

### Projects
Create a [Project](setup_project.html#Create-a-project) to start labeling your data. 

See [API documentation for Projects](/api#tag/Projects).

#### List all projects

To perform most tasks with the Label Studio API, you must specify the project ID, sometimes referred to as the `pk`, or primary key. If you don't know what your project ID is, you might want to get a list of all projects in Label Studio that you can access. See the [List your projects API endpoint documentation](/api#operation/api_projects_list).

#### Create and set up a project
Create a project and set up the labeling interface in Label Studio using the API. See the [Create new project API endpoint documentation](/api#operation/api_projects_create).

If you want to make sure the configuration for your labeling interface is valid before submitting it using the API, you can use the [validate label config](/api#operation/api_projects_validate_create) API endpoint.

### Storage
You can add source storage connections to sync data from an external source to a Label Studio project, and add target storage connections to sync annotations from Label Studio to external storage.

For more information on the types of cloud storage, read the following:

1. [Microsoft Azure storage](storage.html#Microsoft-Azure-Blob-storage) 

2. [Google Cloud storage](storage.html#Google-Cloud-Storage)

3. [Local storage](storage.html#Local-storage)

4. [Redis storage](storage.html#Redis-database)

5. [Amazon S3](storage.html#Amazon-S3)

Also, read the API documentation for [Microsoft Azure storage](/api#tag/Storage:-Azure), [Google Cloud storage](/api#tag/Storage:-GCS), [Local storage](/api#tag/Storage:-Local), [Redis storage](/api#tag/Storage:-Redis), and [Amazon S3](/api#tag/Storage:S3). 

### Tasks
A task represents a distinct item from a dataset that is ready to be labeled, pre-annotated, or has already been annotated. For example: a sentence of text, an image, or a video clip. 

See [API documentation for Tasks](api#tag/Tasks).

#### Retrieve tasks
Retrieve a paginated list of tasks for a specific project. If you want, you can also retrieve tasks and annotations using this API endpoint, as an alternative to exporting annotations. See details and parameters in the [list project tasks endpoint documentation](/api#operation/api_projects_tasks_list).

### Users
[Users](signup.html) are people who signup and have access to use the Label Studio product and experience the various features. The currently logged in/authenticated user.

See [API documentation for Users](/api#tag/Users).

### Webhooks
A [webhook](/webhooks.html) in Label Studio allows you to set up integrations that subscribe to certain events that occur inside Label Studio. 

See [API documentation for Webhooks](/api#tag/Webhooks).
