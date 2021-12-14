---
title: Release notes for Label Studio Enterprise
short: Release notes
badge: <i class='ent'/></i>
type: guide
order: 120
meta_title: Release notes for Label Studio Enterprise
meta_description: Discover what's new and improved, and review bug fixes, in the release notes and changelog for Label Studio Enterprise.
---

This is a list of noteworthy new features and bug fixes for the latest version of Label Studio Enterprise. 

<div class="enterprise"><p>
For the release notes for Label Studio Community Edition, see the <a href="https://github.com/heartexlabs/label-studio/releases">release notes on GitHub</a>.
</p></div>

## New features

This version of Label Studio Enterprise introduces the following new features:

- Write a custom agreement metric to evaluate annotator and model performance according to metrics that you define. See [how to write a custom agreement metric](custom_metric.html) for more.
- Export a snapshot of your data labeling project, specifying what to include in the export. See [more details in the export documentation](export.html).
- Set up webhooks to send events to a configured URL to take automated action in your model pipeline. See [how to set up webhooks](webhooks.html).
- Perform dynamic ML-assisted labeling with interactive preannotation. See [more about ML-assisted labeling with interactive preannotations](labeling.html#Perform-ML-assisted-labeling-with-interactive-preannotations).

This release also includes other important improvements.

### Data manager improvements
- Create annotations from predictions by selecting tasks and using the drop-down menu options. 
- Added the ability to remove reviewer and annotator assignments to tasks using the drop-down menu options for selected tasks. <!--HTX-2143-->
- Enhanced filtering behavior to be robust and support filtering by reviewers, annotators, and fields in your task data. 
- Added the ability to label tasks as displayed, allowing you to filter and sort your data and label tasks accordingly. See more in [Filter or sort project data](manage_data.html#Filter-or-sort-project-data).
- Improved performance by reducing the time it takes to load tasks.

### Labeling and tag improvements

- Added the ability to manipulate regions when labeling images, such as selecting and moving multiple regions, duplicating regions, and more. See [Advanced image labeling](labeling.html#Advanced-image-labeling). 
- Added [new hotkeys to accelerate labeling](labeling.html#Use-keyboard-shortcuts-to-label-regions-faster).
- Added a dedicated [`<Video>` tag](/tags/video.html) and a [`<Number>` tag](/tags/number.html). 
- Added a `hint` parameter for the [`<Label>` tag](/tags/label.html) so that you can provide additional guidance to annotators. <!--HTX-1933--> 

### Import and export improvements

- Remove annotations from a synced S3 bucket when an annotation is deleted. <!--HTX-2084--> 
- Manually sync annotations to a target storage bucket. <!--HTX-1944--> 
- Added the review status for annotations synced to a target storage bucket. <!--HTX-1878--> 
- Export specific tasks by ID. <!--HTX-1868--> 
- Scan bucket prefixes recursively to account for nested dataset storage. <!--HTX-1821--> 
- Specify Google Cloud Storage (GCS) credentials for target storage connections.

See more details in the [cloud storage setup](storage.html) documentation. 

### Assorted other improvements

- Improve LDAP user management to support permission syncing at the workspace level and disallow manual management of project members. See how to [set up LDAP authentication](auth_setup.html#Set-up-LDAP-authentication) for more. 
- See information about your active organization on your user account and settings page, such as your organization ID and an overview of your project and annotation activity. 
- Added the ability to switch between mean time and median time when reviewing how much time annotators took to annotate a task. See more details in the [dashboard documentation](quality.html#Review-annotator-performance). <!--HTX-2041-->
- Added pagination for the projects page. 
- Updated the result format of the API call for `/api/project/id/tasks` to be consistent with the format returned by `/api/tasks/id`. 
- Added the option to hide the skip button from annotators. <!--HTX-1942--> 
- Added the ability to retrieve predictions for all tasks in a project using the API. <!--HTX-1897--> 

## Bug fixes

This release of Label Studio Enterprise includes fixes for the following bugs and other improvements.

- Instructions were not appearing for annotators before labeling in some cases.
- Annotators logging in for the first time with LDAP accounts saw a runtime error. <!--HTX-2169-->
- The "Review Finished" modal appeared before annotation reviews were complete. <!--HTX-2152--> 
- Using the Naive matching metric for brush annotation projects led to unexpected behavior when saving annotations. <!--HTX-2144-->
- Creating users using the API did not work as expected. <!--HTX-2133--> 
- Specifying the `completed_by` user when creating an annotation with the API did not work as expected. <!--HTX-2130-->
- There was an issue with the `Paragraphs` tag. <!--HTX-2119--> 
- There was an issue with labeling only selected tasks. <!--HTX-2110-->
- Brush strokes did not change size when zooming in on an image for labeling.  
- Improved the cards that display to reviewers and annotators. <!--HTX-1997-->
- Submitting predictions as annotations did not work as expected. <!--HTX-1990--> 
- Hotkeys stopping working after submitting an annotation. <!--HTX-1976-->
- The `selected` parameter did not work properly for the `<Label>` tag. <!--HTX-1945--> 
- There was an issue submitting and loading annotations with relations. <!--HTX-1708--> 
- Updating an annotation in the review stream did not work as expected. <!--HTX-1677--> 