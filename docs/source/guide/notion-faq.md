---
title: Notion FAQ
short: Notion FAQ
type: guide
tier: enterprise
hide_menu: true
order: 99
section: "Get started"
layout: "notion"
---
## Signup and Login issues


### User can’t login, or password doesn’t work

1. If the user registered with capitalized email letters, it might lead to this issue. To fix it, you should login as a superuser and replace their email with lowercase letters. Also you can achieve this using LS shell in the terminal (`python3` [`manage.py`](http://manage.py) `shell_plus`):

```python
User.objects.get(email='Capita@Lized.xx').update(email='capita@lized.xx')
```

1. If you use SAML SSO and your SAML accounts have capitalized emails, you should upgrade to LSE 2.4.0. The user emails will be fixed automatically at the next login attempt.

### Password reset


There are 3 ways to reset a password:

1. Using email by “Forgot password” link on the login page. It works in SaaS by default. It can work in on-premise deployments, but you need to set up the email backend.
2. Login as a superuser, go to `/admin/users/user` page, find your user and reset password:

![](/images/notion/2b2224e9a8b54bb.png)

1. Go to LS terminal, run  `/label-studio-enterprise/label_studio_enterprise && python3` [`manage.py`](http://manage.py) `shell_plus`

```python
u = User.objects.get(email='test@test.te')
u.set_password('new-password')
u.save()
```


## Organization level issues


### How to change organization title 

- By default owner email is used as organization title. It can be fixed using `/admin/organizations/` page.
- Or customers can do it through API: `{”title”: “new title”} PATCH api/organization/`

![](/images/notion/420a3db26e6f4c0.png)


## Common LDAP & SAML SSO Questions


### How to setup SAML


Please reference the guide [Setup SAML SSO](https://docs.heartex.com/guide/auth_setup.html#Set-up-SAML-SSO). 


### Change SAML domain name


This action can only be performed using the /admin page because of security reasons. 

1. Go to SAML settings page
2. Find organization you need

![](/images/notion/807d52a6750d434.png)

1. Click on the pk
2. Change the domain

![](/images/notion/a805ae911a9c4b1.png)


### Is the Organization Owner role required to setup LDAP?


There is a special environment variable `AUTH_LDAP_ORGANIZATION_OWNER_EMAIL` that will be used as the organization entry point for the LDAP integration. All users will be linked to the organization where the owner is `AUTH_LDAP_ORGANIZATION_OWNER_EMAIL`. If you require a specific email address to be used, we recommend making that person the  organization owner.


### Where can you get SAML metadata for Azure?


The article below should help to figure out how to setup SAML SSO with Azure Active Directory (AD). The keyword to look for is **SAML metadata,** usually it's available as an URL link or a downloadable XML file:


[https://medium.com/the-new-control-plane/getting-the-required-information-for-a-sp-from-azure-ad-metadata-65c898396ce9](https://medium.com/the-new-control-plane/getting-the-required-information-for-a-sp-from-azure-ad-metadata-65c898396ce9)


### Where can you get SAML metadata for Okta?


We have [a video tutorial](https://docs.heartex.com/guide/auth_setup.html#Setup-SAML-SSO-with-Okta-video-tutorial) about how to setup SAML SSO for Okta.


### On Premise Customers: How can I tell if LDAP/SAML is or is not working?


Aside from logging in an testing for yourself, you have to enable debug mode for app container and inspect logs. There are plenty of them for LDAP and SAML while you are trying to login. To enable debug check this: [https://docs.heartex.com/guide/helm_values.html#Debug-mode](https://docs.heartex.com/guide/helm_values.html#Debug-mode) (you need `app.debug`)


### How can I review the trusted certificates (CA) I’ve are installed?


As of 2.4.2:
[https://labelstud.io/guide/FAQ.html#Add-self-signed-certificate-to-trusted-root-store](https://labelstud.io/guide/FAQ.html#Add-self-signed-certificate-to-trusted-root-store)


### What's the identify provider login page for SAML SSO and LDAP?


For SAML SSO there are two ways to login:

- Go to LSE login page, select SSO login and enter the domain, you will be redirected to your Identity Provider login page.
- You can login in your Identity Provider first and then you will be redirected to LSE main page (project list).

For LDAP there is one way only:

- Go to LSE login page, enter your LDAP username and password

### Bad request 400 error when I try to login using SAML


The most frequent problem when you see “Bad request 400” on SAML login is improperly configured attributes in SAML. Check SAML Attributes mapping in your Identity Provider: it’s very important to have the correct Email field. For example how it looks in Google SAML Identity Provider settings: 


![](/images/notion/33f2429f54624a3.png)


Also you can check them on LSE SAML settings page `/saml/settings`:


![](/images/notion/29f4732404634be.png)


## Unable to import data from Cloud Storage


When working with an [external Cloud Storage connection (S3, GCS, Azure)](https://docs.heartex.com/guide/storage.html), there are few things to bear in mind:

1. Label Studio doesn’t import the data stored in the bucket, but instead creates references to the objects. Therefore, you have full access control on the data to be synced and shown on the labeling screen.
2. The **Sync** with the bucket is only one way - it’s either creating tasks from objects on the bucket (Source storage) or pushing annotations to the output bucket (Target storage). Changing something on the bucket side doesn’t guarantee consistency in results.
3. It is recommended to use a separate bucket folders for each Label Studio project.

### When I click Sync, I don't see my data in project


Go to the cloud storage settings page, click on **Edit** cloud storage connection card settings and check the following:

1. **File Filter Regex** is set and correct. When no filters are specified, all found items are skipped. The filter should be a valid regular expression, not a wildcard (e.g. `.*` is a valid, `*.` not valid)
2. **Treat every bucket object as a source file** should be `ON` if you work with images, audio, text files or any other binary content stored in the bucket. It instructs Label Studio to create URI endpoints and store this as a labeling task payload, and resolve them into presigned https URLs when opening the labeling screen. If you store [JSON tasks in the Label Studio format](https://docs.heartex.com/guide/task_format.html) in your bucket - turn this toggle `OFF`
3. Sometimes the sync process doesn’t start immediately. That is because syncing process is based on internal job scheduler. Please wait, if nothing happens during long period of time - contact us via  form, and please provide the time when you launched the “Sync” job
4. An easy way to check rq workers is to run an export: go to the Data manager, click Export, and create a new snapshot and download the JSON file. If you see an Error, most likely your rq workers have problems. Another way to check rq workers - login as a superuser and go to /django-rq page. You should see a `workers` column, `workers` values shouldn’t be 0 as far as failed column should be empty (0).

![](/images/notion/e0841f2ccad54bb.png)


### JSON files from a cloud storage are not synced, the data manager is empty


Diagnostic steps:

1. Try to enable “Treat every bucket object”. Do you see tasks in DM? If yes, go to (2).
2. Try to disable “Treat every bucket objects”. If you don’t see tasks in DM, your bucket doesn’t have GET permission, seems like it has LIST permission only.

Why does it happen? Because for (1) Label Studio scans bucket and doesn’t read objects, it needs to check existence only. In (2) Label Studio reads data, because it has to extract your JSON files to LS DB. 


### When I click Sync, I see my tasks in the Data Manager, but there is the CORS error inside of tasks


It’s a problem with permissions in your bucket. 


## Data is not shown on the labeling screen


You access the labeling data via navigating to the next task while clicking on submit, or by clicking a row on Data Manager page. If you see the page is hanging, not loading, or partially loaded but some specific screens are not available, there might be problems with data format or accessibility. Try the following:


### Check internet connection


Without an internet connection, you will receive a “Failed to fetch” message each time you try opening the data labeling screen. This is because data content is fetched on the client side at the time you load the app, ensuring secure data flow. Please check your internet connection and reload the page again.


![](/images/notion/6658da1d8d9345a.png)


### Check data access


It is a common scenario when working with external storage that the URLs provided have no or restricted access. It can result in **Not found** (404) or **Permission denied** (403) errors.


To locate this source of error, try navigating to your browser’s _Network_ panel and check to see if there are 403 or 404 errors.


![](/images/notion/b06b8ce963c7484.png)


To validate the link doesn’t work - copy it and try opening in a separate browser tab.


If you see the errors next to your data URLs - check [the most common accessibility errors](https://labelstud.io/guide/storage.html#I-can%E2%80%99t-see-the-data-in-my-tasks) or contact your data provider.


### Check CORS policy


In some cases, you have access to your data, but it still doesn’t show on the screen. That happens for specific data types when CORS headers are not given by the data provider. 


To locate the issue, open browser’s _Console_ and check for the error message similar to:


```text
Access to XMLHttpRequest has been blocked by CORS policy : No ‘Access-Control-Allow-Origin’ header is present on the requested response
```


To fix CORS issue, please [follow the guide](https://docs.heartex.com/guide/storage.html#Troubleshoot-CORS-and-access-problems). 


### Check import data format


In some scenarios, when you import **annotations** or **predictions** along with the input tasks data, incorrectly formatted JSON payload can lead to issues on the labeling page. It breaks javascript code execution that can be also located in the browser’s _Console_ errors. 


Please reference and follow the [input data format scheme](https://docs.heartex.com/guide/predictions.html#Format-pre-annotations-for-Label-Studio).


To locate a problematic task, use the Task ID written in the bottom left corner, e.g. **Task #12345678.** Use this ID to navigate the URL: `https://app.heartex.com/api/tasks/12345678` and check the payload associated with `annotations` and `predictions`


If you see inconsistency with the data format - [remove this task](https://labelstud.io/guide/manage_data.html#Delete-tasks-or-annotations) (or use [API call](https://app.heartex.com/docs/api#operation/api_tasks_delete)) and upload the fixed one.


The most common issues when you import prediction and annotations:

1. you forgot to specify region ids—they should be unique strings across the current annotation
2. you used incorrect `from_name`
3. labels are not wrapped into a list [ ]:

```python
"value": {
  ...
  "labels": ["Car"**]
}**
```


### Check labeling configuration


[Label Studio offers a very flexible labeling configuration interface](https://docs.heartex.com/guide/setup.html#Set-up-the-labeling-interface-for-your-project) that allows you to combine various input / output data formats and apply custom styles and layouts. For example, users can specify a custom layout by injecting CSS code using [`<Style>`](https://docs.heartex.com/tags/style.html)[ component](https://docs.heartex.com/tags/style.html). At the same time, improperly built style definitions can interfere and break some parts of in-app layout.


To locate a browser-specific error, please try to open tasks in another browser (e.g. Chrome).


If you see the data is improperly loaded on the labeling screen, check your labeling configuration in project Settings → Labeling Interface → Code whether there are custom CSS code within `<Style>` or `<View>` components, or under `style` attributes. Try to remove some parts and check your labeling screen again.


A few recommendations to build a proper labeling config CSS code:

- don’t use `.lsf-..` selectors, they are for internal use
- define `className`s for tags and style them in `<Style>` tag
- use `display: flex` or `grid` for convenient layouts
- use `View` tags with styles  to group items

### Check the size of the data


Label Studio has limitations when working with large data chunks (for example, long audio or video files, documents with many pages, etc.). Check if any of the following limitations apply in your case:

- Audio length longer than 30 minutes
- Video length longer than 1 hour
- High-res (4K) Video
- Multi-page image documents (>50 pages)
- Text files >3Mb

### Check parameters of your Cloud Storage connector


A common error is specifying the incorrect bucket region location, or using an expired Session Token. 


Go to the project Settings → Cloud Storage → Edit Cloud storage connector and change settings. If it doesn’t help - try to remove Cloud Storage connector and re-create it again.


### Are you using data contents or URLs?


In some cases, the data is provided original content (e.g. text) or a URL pointed to the remotely stored file (e.g. `http://my.data/example.txt`). Make sure in the latter case you don’t forget to include `valueType="url"` in your object tag. Please read [how to import data in the guide](https://docs.heartex.com/guide/tasks.html#How-to-import-your-data). 


## How to use LSE File Proxy and prepare tasks


1. You run **simple http server** with basic auth on the machine where your local storage is.


`pip install sauth  # sauth - simple http file server with auth
sauth admin 12345 -d /path/to/storage`


2. Now you can have access to images from your storage this way:


`http://localhost:8333/image.jpg  # image is stored as /path/to/storage/image.jpg`


3. Let’s assume your storage server has an IP address 192.168.1.42, so the file name will be


`http://192.168.1.42/image.jpg`


4. LSE server has API in the same network, let it be 192.168.1.77. So, files from storage 192.168.77.42 will be accessible from LSE 192.168.1.77.


5. Let’s expose your storage files to annotators by enabling the basic auth proxy on LSE side:


6. Now we can prepare LS tasks for import:


```python
 {
  "image":"http://192.168.1.42/image.jpg",
  "meta": {
    "info": "test_image"
    "text": "some text"
  }          
}
```


8. LSE will download this image and return to annotators it using its own proxy by this url:


`https://app.heartex.com/api/projects/<project-id>/file-proxy/?url=http%3A//192.168.1.42/image.jpg`


## UI elements are broken


In different situations, you can find the Labeling UI is broken entirely or partially, which could include the following issues:

- Buttons are not clickable
- Interface clutter or UI elements clashing
- Errors while scrolling the page
- Jittering
- etc.

If you only see that in the specific projects, it can be the problem with your labeling configuration and custom styles. 


Try to use another browser (e.g. Chrome), or [follow the Troubleshooting guide](https://docs.heartex.com/guide/faq).


## Extra annotations created in task


Label Studio can control the distribution of tasks across annotators. This is enabled in Project Settings, by defining “Auto” distribution mode and number of required annotations per task. [You read more detail in the guide.  ](https://docs.heartex.com/guide/setup_project.html#Set-up-task-distribution-for-labeling)


Auto distribution mode doesn’t guarantee that all tasks will get exactly the specified amount of annotations - there are many scenarios where users can assign more annotations per task:

- Users with higher privileges than Annotator role can manually create extra annotations.
- When Manual mode is activated - no annotations limits are applied.
- When an Annotator leaves their task in “Draft” mode (edited, not submitted), they can revert back to the task and complete it. It doesn’t guarantee that the same task wasn’t returned back in the labeling queue and labeled by other project members.

## Agreement numbers issue


### Agreement numbers are empty in Data Manager column


Agreement numbers are not calculated immediately but with some delay ranging from seconds to minutes depending on the traffic and availability of computational resources. 


If they still don’t appear in the corresponding Agreement column, try doing the following:

1. Go to project > Settings > Quality page
2. Under **Annotation Agreement** use the dropdown selector to choose any other Matching function then click Save.
3. Use the same dropdown to reselect the previous Matching function and save it again

That effectively reset Matching function procedure and restarts the underlying agreement calculation job. After a while, you should be able to see the numbers in Agreement column on a Data Manager page. 


## Slow loading time


The Label Studio cloud service provides scalability and low-latency for labeling user flow; however, there are some known limitations that could lead to performance degradations:


### Local network provider latency


Sometimes page slowness can be affected by local network provider latency. Open your browser’s Network settings and check timings. Try again to refresh the page after some time.


### High traffic


When there is high traffic to [app.heartex.com](http://app.heartex.com) , you may experience temporary page slowdowns. Typically it takes no longer than a few minutes to restore to the normal condition. Please be patient, as we’re working on enhancing predictability of scaling up the workflow in these cases. Please contact us in case you see some unusual slowdowns, by providing the exact time, project and user account  


### Data-related pages: Data Manager, Reports


Some of the pages’ performance depends on the volume of the data you store in the project. The bigger the project size in terms of the number of tasks, columns and created annotations, the slower are expected times to open Report pages (e.g. “Dashboard”, “Members”) or apply filters on the “Data Manager” page.


Try to reduce the number of the data in project. If the problem persists or if you see the page becomes non-responsive or result in error modals (e.g. **Gateway timeout**) - please contact us via  form by specifying the time, project and user account.


### Export snapshot takes a long time


There can be a problem with underlying job scheduler that may take a while to execute the export of jobs for your project. You can close the export dialog window, continue working and come back again to check the export status. If you see the error message -  providing your project ID / URL.


### Export snapshot takes endless time


Most likely RQ Workers are 

- overloaded with other jobs
- setup incorrectly in your on-premise deployment

To inspect this issue you should open `/django-rq` page and see number of workers in Workers column:


![](/images/notion/6bfd8f8f5e5549b.png)


If you see 0, it’s definitely a problem with your rq worker setup, you have to connect with your devops team and check what **rqworker containers** are running. 


Also you can go inside of `Failed jobs` and check the error message in the each job, it will provide debug information to solve the issue. 


### Annotation result or Annotators filter is slow


Try upgrading to the most recent version of Label Studio Enterprise. This filter was significantly updated in Label Studio Enterprise 2.4.0 (and beyond). 


### Most of the API works slowly, the LS instance has more than million tasks


[Try to run postgresql VACUUM, ANALYZE and REINDEX](https://confluence.atlassian.com/kb/optimize-and-improve-postgresql-performance-with-vacuum-analyze-and-reindex-885239781.html)


## Other issues


[Troubleshoot Label Studio](https://docs.heartex.com/guide/faq)


## Recommendations & best practices

1. Don’t use GUI file uploads to avoid limitations. GUI uploads work for toy projects when you try to do proof-of-concept things. Configure external storage instead.
2. It’s best to keep about 100k tasks / 100k annotations per project for optimal performance.
3. Recommended browser is Google Chrome.
4. Avoid frequent imports because each new import starts long background calculations. One import per 30 seconds will work without overloads.
5. Task API limit is 100 per page (per request). If you try to use more, it will be truncated.

### On-premise production upgrades

1. Use a staging environment to test the upgrade process before performing it on the production environment. This can help identify and fix any issues before they affect production systems.
2. Always follow the Heartex’s guidelines and recommendations for upgrading software. This may include specific steps or prerequisites, compatibility requirements, or recommended configurations.

## Post-processing for exports 


## How to calculate annotator distribution over annotations


This script helps to evaluate how many annotations do annotators have in the export snapshot:


```python
import sys
import json
from collections import Counter

tasks = json.load(open(sys.argv[1]))

emails = []
for task in tasks:
  for annotation in task['annotations']:
    emails.append(annotation['completed_by']['email'])

c = Counter(emails)

for email, count in c.most_common():
  print(email, count)

print('Total', len(emails))
```


## Contact Support


If you are not able to resolve the issue by yourself - no worries, our Tech Support team for enterprise customers will always assist you as fast as we can, as well as mitigate the issue in case if it is a product-side bug. We are continuously working on enhancing performance and improving user experience, which means all issue reports are carefully analyzed and processed in a timely manner by engineering team. Even if you don’t receive immediate feedback and status updates - be sure that your found bug will be fixed in the upcoming versions.


Do not hesitate to contact via one of the following way:

- [**Service Portal Form**](https://heartex.atlassian.net/servicedesk/customer/portal/3) (preferred)
- Dedicated Slack channel
- Customer success manager

We kindly appreciated you providing us with the most information possible regarding the issue you face. It greatly speeds up the investigation and remediation of the problem. Please collect and send us the following information when possible:

- Page URL you see the error
- Project ID (in case you’re working on app.heartex.com) or the output of `/api/projects/<id>` page or project labeling configuration and other project settings
- Task ID (you can retrieve it at the bottom left corner)
- User account email
- Exact date and time (with timezone)
- Screenshot of the page with browser _Console_ and _Network._ If the error is easily reproducible, do it in the following order:
	- Open browsers’ Console and Network
	- Go to the page where you see the error
	- Refresh the page
	- Make a screenshot
- Video recording of the steps led to the error is better than one screenshot
- Any other intel that you find useful to give us the context
