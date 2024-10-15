---
NOTE: Don't change release_notes.md manually, it's automatically built from onprem/*.md files on hexo server run!   

title: On-Premises Release Notes for Label Studio Enterprise
short: On-Prem Release Notes
type: guide
tier: enterprise
order: 0
order_enterprise: 451
section: "What's New"
meta_title: On-premises release notes for Label Studio Enterprise
meta_description: Review new features, enhancements, and bug fixes for on-premises Label Studio Enterprise installations. 
---

!!! note 
    The release notes for Label Studio Community Edition are available from the <a href="https://github.com/HumanSignal/label-studio/releases">Label Studio GitHub repository</a>.

!!! note 
    Before upgrading, review the steps outlined in [Upgrade Label Studio Enterprise](upgrade_enterprise) and ensure that you complete the recommended tests after each upgrade. 

<div class="release-note"><button class="release-note-toggle"></button>
<a name="2120md"></a>

## Label Studio Enterprise 2.12.0

<div class="onprem-highlight">New experimental Cache Labels action in the Data Manager, annotation history in snapshots, new setting to restrict local imports into Label Studio, and changes to how the Hide Storage Settings for Manager environment variable works. </div>

*Jun 04, 2024*

Helm Chart version: 1.4.8


### Enhancements

- There is a new experimental **Cache Labels** action available from the Data Manager. This action extracts labels from annotations or predictions and compiles that information into a new column in the Data Manager. You can then use this column for faster searching and filtering.

    To enable experimental features, set the `EXPERIMENTAL_FEATURES` environment variable to `True`. However, note that experimental features are not fully supported.
- When you create a new snapshot, you will now have the option to include annotation history:

    ![Screenshot of the snapshot dialog](/images/releases/2_12_snapshot.png)
- There is a new setting that can restrict users from uploading data directly to Label Studio, forcing them to only use cloud storage. If you would like to enable this setting, set the `DISABLE_PROJECT_IMPORTS` environment variable to `True`.
- For organizations with the  `HIDE_STORAGE_SETTINGS_FOR_MANAGER` environment variable set to `True`, Managers will now be able to sync data from external storage as necessary rather than request assistance from an Admin user.

### Security

- Updated xml2js and Babel to avoid a vulnerabilities found in earlier versions.

### Bug fixes

- Fixed an issue in which users were allowed to submit empty annotations when using hotkeys, even though empty annotations were disabled via the **Allow empty annotations** project setting. 

- Fixed an issue with button sizing inconsistency when selecting date ranges.

- Fixed an issue where regions were disappearing when a user would switch between annotations and predictions.

- Fixed an issue that prevented users from fetching the URL for TimeSeries objects.

- Fixed an issue where, if there was no name provided for a cloud storage connection, the project settings page would not load.

- Fixed an issue with environment variables that have the prefix `LABEL_STUDIO_` appearing in context logs.

- Fixed an issue where errors were appearing in the user console related to loading large JS files.

- Fixed an issue in which users who have their own organization could not be added to another organization using SCIM.

- Fixed an issue where SCIM was not handling adding or disabling users in situations where the user limit was exceeded.

- Fixed an issue where SCIM was creating duplicate users in situations in which there were discrepancies in casing used in their domain names.

- Fixed an issue where logs were failing because the default level was set to `DEBUG`. The default log level is now `INFO`.

- Fixed an issue in which the **Start Training** action for ML backends was sending the `PROJECT_UPDATE` webhook event instead of `START_TRAINING`.

- Fixed an issue where the **Batch Predictions** action was failing under certain conditions.

- Fixed an issue where tooltips on the dashboard were causing confusing mouseover behavior even when not visible.

- Fixed an issue where multiple errors would appear in the console when users navigated away from the Data Manager.

- Fixed an issue where the progress bar for projects was not properly accounting for tasks that required additional annotators due to low agreement settings.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2111post2md"></a>

## Label Studio Enterprise 2.11.1.post2

<div class="onprem-highlight">Bug fix</div>

*May 30, 2024*

Helm Chart version: 1.4.8

### Bug fixes
- Fix Redis connection with SSL.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2111post1md"></a>

## Label Studio Enterprise 2.11.1.post1

<div class="onprem-highlight">Bug fix</div>

*May 07, 2024*

Helm Chart version: 1.4.6

### Bug fixes
- The `COLLECT_ANALYTICS` environment variable can now be specified in uppercase or lowercase (`collect_analytics`).






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2111md"></a>

## Label Studio Enterprise 2.11.1

<div class="onprem-highlight">Improved machine learning & LLM integrations, action to remove duplicated tasks, Redis ACL support, and other enhancements and bug fixes</div>

*Apr 30, 2024*

Helm Chart version: 1.4.4

### New features 

#### Improved machine learning & LLM integrations

This release streamlines the way ML models and LLMs are connected to Label Studio with a focus on security and simplified user experience. 

Using the powerful ML backend integration, users can add models and customize automated workflows for:

- **Pre-labeling**: Letting ML/AI models predict labels autonomously, which can then be reviewed by human annotators.
- **Interactive labeling**: An automated process that applies initial labels to data, which are then refined through manual review, enhancing the efficiency and accuracy of data annotation for machine learning models.
- **Model evaluation and fine-tuning**: Used in models like the Segment Anything Model (SAM), involves a human-in-the-loop approach where the model provides initial predictions or annotations, and a human annotator interacts directly with these predictions to correct or refine them.

Label Studio Enterprise users can add custom models, or reference a [new examples library](https://github.com/HumanSignal/label-studio-ml-backend/tree/master) to connect popular models, including Segment Anything, OpenAI, Grounding DINO, select Hugging Face models, Tesseract, and more.

Updates to the ML backend integration in this release include:

- New support for basic auth, which means users can now connect to hosted ML backends that require a password.
- The ability to specify additional parameters to pass to the model, which means users can now easily connect to Azure-hosted OpenAI in addition to OpenAI and popular ML models.
- An improved UI and simplified project settings, including:
    - A new **Live Predictions** section under the **Annotation** page of the project settings makes it easier select whether you want to use predictions or a model in your annotation workflow.
    - A new **Predictions** page, where you can easily upload and manage predictions.
    - Removed obsolete settings that are no longer compatible (for example, auto-updating version).
    - Fixed various usability issues related to the annotation experience with a model connected.

For more information, see [Integrate Label Studio into your machine learning pipeline](ml).

![Screenshot of the new ML backend screens](/images/releases/2-11-0-ml-backend2.png)

![Screenshot of the new ML backend screens](/images/releases/2-11-0-ml-backend.png)


#### Remove Duplicated Tasks action

There is a new Remove Duplicated Tasks action available from the Data Manager. This action had previously only been available as an experimental feature.  

When you use this action, annotations from duplicated tasks are consolidated into one task (the first task found among the duplicated tasks). 

![Screenshot of the Remove Duplicated Tasks action](/images/releases/2-11-1-remove-duplicate.png)


### Enhancements

- Redis ACLs are now supported.

- Improved usability for project dashboards by changing how time filtering works to more accurately reflect annotation progress.

- Multiple domains per organization are now supported for SSO login.


### Security

- Enhanced validation to ensure that projects created through the API have workspaces within the active organization.

- Fixed an issue in which insufficient permission checks were performed for certain API calls.


### Bug fixes

- Fixed an issue where, during the review process, the mouse cursor would disappear against light gray backgrounds.

- Fixed an issue where some tasks were not displayed when using the review explorer.

- Fixed an issue with missing text in results for specific OS and browsers.

- Fixed an issue which could produce incorrect unresolved comment counts when updating the comment `is_resolved` state

- Fixed an issue in which the Dashboards page returned an error if the project had no tasks.

- Fixed an issue with project dashboard label distribution charts in which some labels could be improperly grouped.

- Fixed an issue where blank charts would be created in the project dashboards. 

- Fixed an issue in which project dashboard charts would return errors and appear empty.

- Fixed an issue is which the `TextArea` input area would resize while you were editing it.

- Fixed an issue with loading data manager while there are trailing special characters in keys of imported data.

- Fixed an issue where validation would fail for `<Table>` tags when the imported data used list format.

- Fixed an issue in which exporting data would use excessive memory.

- Fixed an issue in which some icons were not displayed correctly.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2110post1md"></a>

## Label Studio Enterprise 2.11.0.post1

<div class="onprem-highlight">Bug fix</div>

*Apr 29, 2024*

Helm Chart version: 1.4.4

### Bug fixes
- Fixed an issue where application logging was not working. 






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2110md"></a>

## Label Studio Enterprise 2.11.0

<div class="onprem-highlight">New ability to configure project-level roles, setting to hide the Cloud Storage page from Manager roles, other enhancements and bug fixes </div>

*Apr 09, 2024*

Helm Chart version: 1.4.2

### New features

#### Project-level roles

You can now assign the Reviewer or Annotator role to users on a per-project basis. This will help simplify team management and allow more flexibility for project managers within your organization to meet the needs of each project.  

This feature was previously only available to organizations who had enabled SCIM for their user management. Now, project-level roles can be assigned as part of the project membership settings, and is applicable to any user who has the Annotator or Reviewer role at the organization level. For example, a user can be an Annotator at the organization level, but have the Reviewer role for a specific project. Similarly, a user with the Reviewer role at the organization level can be assigned as an Annotator to different projects as needed. 

For more information, see [Project-level roles](#Project-level-roles).

![Screenshot of the project-level roles](/images/releases/2-11-0-project-level-roles.png)

### Enhancements

- Added support for `X-Api-Key: <token>` as an alternative to `Authentication: Token <token>`. This will make it easier to use API keys when integrating with cloud-based services. 
- Small UI improvement to make it clearer which project members are included in the project by default.
- There is a new setting in place that can control access to the Cloud Storage page for users with the Manager role. If you would like to enable this setting, set the `HIDE_STORAGE_SETTINGS_FOR_MANAGER` environment variable to `True`.
- Several enhancements for organizations with SCIM enabled, including:
    - More detailed error messages.
    - Allow workspace and role mappings to support multiple SCIM groups.

### Bug fixes

- Fixed an issue where Google Cloud Logging was not working due to a missing dependency.
- Fixed an issue where `/api/version` was not reporting all updates.
- Fixed an issue where, after revoking an invite to users who are already in projects, the project failed to load.







</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2101post2md"></a>

## Label Studio Enterprise 2.10.1.post2

<div class="onprem-highlight">Bug fix</div>

*Apr 02, 2024*

Helm Chart version: 1.4.0

### Bug fixes

- Fixed an issue that prevented the docker-compose instance from starting due to a misconfiguration in the internal discovery settings.





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2101post1md"></a>

## Label Studio Enterprise 2.10.1.post1

<div class="onprem-highlight">Security-related fixes</div>

*Mar 13, 2024*

Helm Chart version: 1.4.0

### Security

- Upgrade vulnerable versions of Pillow and Cryptography
- Remove unused `requirements.*.txt` files that referred to old packages with CVEs




</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2101md"></a>

## Label Studio Enterprise 2.10.1

<div class="onprem-highlight">New <b>Reset Cache</b> action for projects, security update for activity logs, various bug fixes</div>

*Mar 12, 2024*

Helm chart version: 1.4.0

### Enhancements

There is a new **Reset Cache** action available from project settings under the **Danger Zone** section. You can use this action to reset and recalculate the labeling cache. 

This action is particularly useful for situations in which you are attempting to modify the labeling configuration and you receive a validation error pointing to non-existent labels or drafts. 

![Screenshot of the Reset Cache action](/images/releases/2-10-1-reset-cache.png)

### Security

Fixed an issue where sensitive information was available in activity logs. 

### Bug fixes

- Fixed an issue where users could not submit annotations if the labeling configuration included the `TextArea` tag with the `required` and `skipDuplicates` parameters.

- Fixed an issue where the Projects page was displaying the wrong number when indicating how many projects are displayed on the page.

- Fixed an issue where when calling `GET api/tasks?projects={id}&fields=all`, reviews were not returned.

- Fixed an issue where an empty draft was created every time a user clicked **View all annotations**.

- Fixed an issue where the URL in email invites was missing the `http` protocol.

- Fixed an issue where sometimes the **Refresh** action on the project dashboard would be stuck in a loading state.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2100md"></a>

## Label Studio Enterprise 2.10.0

<div class="onprem-highlight">Granular API-level control over annotation history, UI enhancements for performance and user experience, security updates, bug fixes</div>

*Feb 13, 2024*

Helm chart version:  1.4.0

### Enhancements

- More granular API-level controls: 

    - Implemented datetime filtering to the per-project annotation history API to support analytics queries and reporting.  Now you can filter [`/api/projects/{id}/annotation-history`](https://app.heartex.com/docs/api/#tag/Annotation-History/operation/api_projects_annotation-history_list) by `created_at_from` and `created_at_to`.

- Made several updates to the UI to improve performance and user experience, including:

    - Better formatting for longer text strings when using the grid view in the Data Manager.

    - The Projects page is now limited to 12 projects per page, improving load time performance..

    - Added a confirmation message after deleting a user.


### Security

- Implemented comprehensive HTML sanitization to safeguard against vulnerabilities and ensure a secure user experience.

- This release includes several measures to increase SSRF protection, which address [`CVE-2023-47116`](https://github.com/HumanSignal/label-studio/security/advisories/GHSA-p59w-9gqw-wj8r):
    - When `SSRF_PROTECTION_ENABLED` is set to `true` (note that it defaults to `false`), our new default is to ban [all IPs within reserved blocks](https://en.wikipedia.org/wiki/Reserved_IP_addresses), for both IPv4 and IPv6.
    - We are introducing two new environment variables, to be used in conjunction with `SSRF_PROTECTION_ENABLED=true`:
        - `USER_ADDITIONAL_BANNED_SUBNETS` — Use this to specify additional IP addresses or CIDR blocks to ban from server-side requests (e.g. the URL-based file uploader).
        - `USE_DEFAULT_BANNED_SUBNETS` — This is set to `True` by default. If you would like to have full control over banned subnets, you can set this to `False` and use `USER_ADDITIONAL_BANNED_SUBNETS` to specify all the IP addresses/CIDR blocks you’d like to disallow instead.
    - We have also improved our error messages to make it clearer when an action is being blocked due to SSRF protections.


### Bug fixes

- Fixed an issue with the Number tag in which the `max`  constraint was not working.

- Fixed an issue with the Number tag where `toName`  was not validated.

- Fixed an issue in which users were seeing an error when switching from task details to settings while working with a video annotation.

- Fixed an issue where comments that were entered but not submitted were preserved even when navigating between annotations. This could lead to users accidentally submitting comments they did not want to save.

- Fixed several issues where the refresh action was disabled depending on the selections that users would make when filtering for date and time ranges in the project dashboard.

- Fixed an issue where users were not shown a confirmation message after clicking **Submit and exit** in the label stream.

- Fixed an issue where Label Studio crashed when configuring multiple hotkeys using the `hotkey=","` format.

- Fixed an issue where annotation drafts were not saving when switching to view all mode.

- Fixed an issue where users would encounter an error when using the **Storage filename** filter in the Data Manager.

- Fixed an issue where relations were not displayed if they were added by a user while reviewing a task.

- Fixed an issue where the **Comments** tab was disappearing when users resized their screen.

- Fixed an issue where drop-downs were occasionally displaying offset from their triggering element.

- Fixed an issue where, if a user attempted to de-select a region by clicking outside of it, they would create a new region instead.

- Fixed a small styling issue in the **Delete Member** modal title.

- Fixed an issue where users could not use the Magic Wand tool with image preloading enabled.

- Fixed an issue with duplicate default hotkeys when working with multi-image segmentation.

- Fixed an issue where the Organization page roles filter would briefly display an incorrect number.

- Fixed an issue where deactivated users were not listed in Members pages.

- Fixed an issue where the **Review** button counter was not displaying the correct count in certain scenarios.

- Fixed an issue where the Data Manager was not displaying `false`  or `0`  values as expected.

- Fixed an issue where, when assigning tasks in bulk, 1 out of ~150 tasks would be left unassigned.

- Fixed an issue where, if a user was a member of multiple organizations, they would not see a confirmation message after saving an annotation draft.

- Fixed a regression issue in which regions text was not displayed properly in regions list.

- Fixed an issue where invite signup links were missing `http` validation.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="290-2md"></a>

## Label Studio Enterprise 2.9.0-2

<div class="onprem-highlight">Bug fix</div>

*Jan 26, 2024*

Helm chart version: 1.3.3

### Bug fixes
- Fixed an issue where users were unable to use the **View all annotations** option when the project included images that had an empty URL.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="290-1md"></a>

## Label Studio Enterprise 2.9.0-1

<div class="onprem-highlight">Bug fix</div>

*Jan 23, 2024*

Helm chart version: 1.3.3

### Bug fixes
- Hotfix for displaying non-string values in Text tag






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="290md"></a>

## Label Studio Enterprise 2.9.0

<div class="onprem-highlight">Improved webhook performance and various UI improvements</div>

*Jan 16, 2024*

Helm chart version: 1.3.3

### Enhancements

- Improved webhook performance by assigning them to their own queue.

- Adjusted spacing in the SCIM and SAML/SSO pages to improve readability.

- When configuring SCIM with Okta, we will respond to their `userName` filter requests with the `email` attribute to ensure unique identifiers while maintaining compatibility.

- When hovering over the **Submitted Annotations** card on the project dashboard, the tooltip will make it clear when the number includes skipped and empty annotations.


### Security

- Fixed an issue with HTML sanitization to address a vulnerability identified by CodeQL.
- Addressed [`CVE-2024-23633`](https://github.com/HumanSignal/label-studio/security/advisories/GHSA-fq23-g58m-799r) by setting a `sandbox` CSP header on the `/data/upload/` endpoint. 

### Bug fixes

- Fixed some usability issues in the project Dashboards page related to the date picker and page refresh.

- Fixed an issue where, when labeling tasks, hiding a region would create a draft and display the **Fix and Accept** action, even if no other changes had been made.

- Fixed an issue where credential validation was failing in the Label Studio interface for cloud storages configured using SDK.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="280md"></a>

## Label Studio Enterprise 2.8.0

<div class="onprem-highlight">Improved member list filtering from the Organization page, collapsible Ranker items, various UI improvements</div>

*Dec 19, 2023*

Helm chart version: 1.3.2

### Enhancements

- The members list on the Organization page now allows you to filter by one or more roles. By default, Deactivated and Not Activated users are hidden. This makes it easier to locate users within the member list.

    ![Screenshot of org list filter](/images/releases/2-8-0-org-list.png)

- You can now expand and collapse Ranker items for easier management and rearrangement.

    ![Animated gif of Ranker in action](/images/releases/2-8-0-ranker2.gif)

- Added a new `disable_reviewer_annotator_tokens`setting for organization licenses. When set to `true`, token authorization is disabled for users in the Reviewer and Annotator role. This will help maintain organization security by preventing users from accessing Label Studio via the API.

- Updated the font and spacing for the **Submit and Exit** button to match Label Studio UI styling guidelines.

- Updated text on the SAML and SCIM settings pages to match Label Studio UI styling guidelines.

- Improved error message clarity when configuring SCIM.

- Added the ability to reinstate deleted users by re-inviting them to the organization.

- Improved usability of the Label Interface Settings options, so that clicking anywhere within the description toggles the setting.

### Security

- Upgraded urllib3 to 1.26.18 to address [CVE-2023-45803](https://github.com/advisories/GHSA-g4mx-q9vg-27p4), and Django to 3.2.23 to address [CVE-2023-46695](https://github.com/advisories/GHSA-qmf9-6jqf-j8fq).

- Patched an ORM leak vulnerability. 

- Due to an XSS vulnerability, we previously added a requirement that users must log in to view the Label Studio API doc reference and Swagger. You can now view the [API docs](https://app.heartex.com/docs/api/) without logging in. However, the Swagger version is still only available to logged in users. 


### Bug fixes

- Fixed an issue where reviewers could not see annotation ID column.

- Fixed an issue where role selections were not persisting after reloading the Organization page.

- Fixed an issue where deleted users were appearing in the members list on the Organization page.

- Fixed an issue where the Labeling Interface was not saving user changed.

- Fixed an issue where activity logs contained sensitive information when using SCIM.

- Fixed an issue where users were unable to edit polygon points.

- Fixed a sync error when importing large amounts of tasks from Azure storage.

- Fixed an issue where the crosshair parameter was not working.

- Fixed an issue where the **Draft saved successfully** message was appearing when it wasn’t needed.

- Fixed some usability issues in the project Dashboards page related to the date picker and page refresh.

- Fixed an issue with wrong position of brushstroke highlighted on hover.

- Fixed an issue with relation positions in multi-image segmentation.

- Fixed an issue where the **Auto accept annotation suggestions** toggle was not working as expected in some situations.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="270-1md"></a>

## Label Studio Enterprise 2.7.0-1

<div class="onprem-highlight">Bug fix</div>

*Dec 06, 2023*

### Bug fixes
- Fix UWSGI config to support IPv4 only host networks.





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="270md"></a>

## Label Studio Enterprise 2.7.0

<div class="onprem-highlight">External taxonomy, group visibility in label distribution charts, soft delete users</div>

*Nov 21, 2023*

Helm chart version: 1.2.9

### New Features

#### External taxonomy

This release introduces the ability to load an external taxonomy into your labeling configuration. The mechanism for this is a new `apiUrl` parameter on the Taxonomy tag, which allows you to load your taxonomy from an external JSON-formatted file. Previously, you had to use `Choice` tags to manually define your taxonomy within the labeling configuration. 

This feature provides multiple benefits, including:

- **Performance** - Significant performance improvements for large taxonomies.
- **Usability and standardization** - With JSON formatting and the ability to manage taxonomies in your editor of choice, external taxonomies are easier to organize and update.
- **Security** - You can now securely store taxonomies outside of Label Studio.

Fore more information, see [Quickly Load and Manage Large-Scale Taxonomies From External Sources](https://humansignal.com/blog/new-quickly-load-and-manage-large-scale-taxonomies-from-external-sources/), the [Taxonomy template](https://docs.humansignal.com/templates/taxonomy), and [Taxonomy tag](https://docs.humansignal.com/tags/taxonomy). 

![Animated gif showing taxonomy in action](/images/releases/2-7-0-taxonomy.gif)

#### Group visibility in label distribution charts and drag-and-drop reordering

When a labeling configuration includes multiple label groups, you can now use the project dashboard to gain insight into label group performance.   

A new **Summary** view displays a donut chart showing label group distribution. This allows for more visibility into your labeling progress, and will help you identify areas within a project that might need additional task data.  

![Screenshot of label group distribution chart](/images/releases/2-7-0-label-groups.png)

You will also now be able to drag-and-drop the KPIs and charts to reorder them to your preference. 

For more information, see [Introducing Label Distribution Charts for Label Groups and User Soft Delete](https://humansignal.com/blog/introducing-label-distribution-charts-for-label-groups-and-user-soft-delete/). 

![Animated gif showing dashboard reordering](/images/releases/2-7-0-reorder.gif)

#### Soft delete users

Administrators can now delete users through the app or the API. This feature is intended to provide enhanced user management for administrators while minimizing potential security risks. 

Previously, administrators could only remove users by deactivating their account. However, this made it difficult to differentiate between users who are unlikely to return (such as a former employee) and users who might be temporarily inactive (such as freelance annotators). Now you can choose to either deactivate or delete a user. 

For more information, see [Introducing Label Distribution Charts for Label Groups and User Soft Delete](https://humansignal.com/blog/introducing-label-distribution-charts-for-label-groups-and-user-soft-delete/). 

![Screenshot of user delete action](/images/releases/2-7-0-user-delete.png)

### Enhancements

- Added support for AWS Signature Version 4 query parameters.
- The **Submitted Annotations** metric on project dashboards now includes a tooltip with additional information about skipped and empty annotations.

    ![Screenshot of tooltip on dashboard](/images/releases/2-7-0-tooltip.png)

### Security

- Fixed an SSRF DNS rebinding issue.
- Fixed an XSS vulnerability on certain error pages.
- Fixed an XSS vulnerability related to file extensions for avatars. This change addresses [`CVE-2023-47115`](https://github.com/HumanSignal/label-studio/security/advisories/GHSA-q68h-xwq5-mm7x).

### Bug fixes

- Fixed an issue where a validation error was improperly displayed when setting the labeling configuration for a project.
- Fixed an issue with zoom performance in Image Segmentation cases.
- Fixed an issue where annotator performance dashboard agreements were incorrect.
- Fixed a run time error seen when syncing with Azure blob storage.
- Fixed an issue where tasks created through source storage were not triggering webhooks.
- Fixed an issue where code was unnecessarily executing when contextual scrolling was disabled.
- Fixed an issue where draft annotations were not being saved before navigating away.
- Fixed an issue where `PATCH api/tasks/<id>` was returning an error.
- Fixed an issue where a duplicate project would incorrectly contain an annotation count with no annotations copied.
- Fixed an issue where agreement groundtruth API calls were using excess resources.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="260-2md"></a>

## Label Studio Enterprise 2.6.0-2

<div class="onprem-highlight">Improved label and review stream counter</div>

*Oct 27, 2023*

### Enhancements
- Improved label and review stream task counter to reflect the total available tasks for the user. 






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="260-1md"></a>

## Label Studio Enterprise 2.6.0-1

<div class="onprem-highlight">Bug fix</div>

*Oct 26, 2023*

### Bug fixes

- Fixed an issue where `PATCH api/tasks/<id>` was returning errors. 





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="260md"></a>

## Label Studio Enterprise 2.6.0

<div class="onprem-highlight">New <code>snap</code> parameter for KeyPoint, KeyPointLabels, Polygon, and PolygonLabels tags, improved usability when reviewing video in Outliner </div>

*Oct 24, 2023*

### Enhancements

- The [Keypoint](https://labelstud.io/tags/keypoint), [KeyPointLabels](https://docs.humansignal.com/tags/keypointlabels), [Polygon](https://docs.humansignal.com/tags/polygon), and [PolygonLabels](https://docs.humansignal.com/tags/polygonlabels) tags all support a new `snap` parameter for use in Image Segmentation labeling. When `snap="pixel"` is enabled, the (x, y) coordinates of each point are rounded to the pixel size. This enhancement will help ensure precise and uniform coordinates within images. For polygons, points are snapped to the pixel edge. For example, given a polygon point with the coordinates (0.25, 0.25), your resultant coordinates would snap to the edge of the pixel at (0,0). For keypoints, points are snapped to the pixel center.  For example, given a keypoint with the coordinates (0.25, 0.25), your resultant coordinates would snap to the center of the pixel at (0.5,0.5).
- When reviewing video in Outliner, if you click on a marked region, the video playback will automatically jump to the selected region. Previously, users had to manually scroll to the starting point. This change will make it easier to quickly view and edit video segments.

### Breaking changes

- This release adds a deployment-wide `VERIFY_SSL_CERTS` setting that defaults to `true`. Customers who are loading data (e.g. uploading tasks) from https URLs without verifiable SSL certificates must set `VERIFY_SSL_CERTS` to `false` in their environment variables before deploying Label Studio 2.6.0+.
- Add `WINDOWS_SQLITE_BINARY_HOST_PREFIX` environment variable to support hosting SQLite binaries on a server other than [sqlite.org](http://sqlite.org/), for Windows deployments running Python 3.8 only.

### Bug fixes

- Fixed an issue where pressing `Ctrl +` or `Ctrl -` (Windows) or `Cmd +` or `Cmd -` (Mac) was not zooming in/out on images as expected.
- Fixed an issue where the number of drafts displayed in the project summary was not updated when drafts were submitted as annotations.
- Fixed an issue where, in certain contexts, labeling instructions were displayed in raw HTML.
- Fixed an issue that occurred after project creation in which users were prevented from moving forward if changes were made in the template preview.
- Fixed an issue where AWS Lambdas custom agreement functions only worked for `Choice` tags.
- Fixed an issue where custom metrics for agreements weren’t working for annotations that had drafts.
- Fixed an issue where users were unable to navigate through their task list after saving a draft.
- Fixed an issue where, when viewing the Projects page, reviewers and managers were not seeing the total number of annotations in a project.
- Fixed an issue where blank drafts were being created when annotations were submitted.
- Fixed several issues with how annotation drafts were handled. Users will now see a more descriptive error message when trying to update a labeling configuration that is still being used in annotations or in drafts. Also, when using the Data Manager to delete all annotations, this will also delete all task drafts and annotation drafts.
- Fixed an issue where when duplicating a project that had cloud storage, the storage sync status and number of synced items was also copied when they should be reset.
- Fixed an issue of missing annotators from members dashboard when a performance optimization is enabled.
- Fixed an issue where `<Choice selected="true">` was not working within the `Taxonomy` tag.
- Fixed an issue that would cause a blank draft to be created when using hot-keyed annotation submit.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="250-1md"></a>

## Label Studio Enterprise 2.5.0-1

<div class="onprem-highlight">Security fix</div>

*Sep 30, 2023*

### Security
- Security fix for Data Manager





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="250md"></a>

## Label Studio Enterprise 2.5.0

<div class="onprem-highlight">Project-level roles for SAML/SCIM, ability to pause annotation sessions</div>

*Sep 28, 2023*

### New features

- Project-level roles are now available and configurable through SAML or SCIM.  By mapping user groups to project roles, you'll have more granular access controls for your data and you can simplify permissions management for internal teams and annotators. For more information, see [the HumanSignal blog](https://humansignal.com/blog/manage-and-restrict-access-to-your-data-at-a-more-granular-level-with-project-based-roles/) and [the related documentation](https://docs.humansignal.com/guide/scim_setup#Set-up-group-mapping). 

    ![Screenshot of SCIM mapping for project roles](/images/releases/2-5-0-project-roles.png)

- Users can now pause their annotation session so that they can take a break from annotating without it affecting their lead time scores. They can do this by selecting **Submit and Exit** or **Update and Exit**. Their work is automatically saved as a draft. For more information, see [Exit a labeling flow](https://docs.humansignal.com/guide/labeling#Exiting-a-labeling-flow). 

    ![Screenshot of the Save and Exit option when labeling](/images/releases/2-5-0-submit-and-exit.png)

### Enhancements

- Improved performance of prediction counter calculations, leading to faster response times for project pages and stats calculations. 
- Improved dashboard load times, correcting an issue that caused projects with numerous different labels to timeout. 

### Bug fixes

- Fixed an issue where attempting to access AWS target storage resulted in a 403 error. This was fixed by allowing prefix-level bucket access. 
- Fixed an issue where an XSS vulnerability meant that a user’s cookies could be exposed when viewing our API documentation. As a result, users must now be logged in when visiting the Label Studio Enterprise [API docs page](https://app.heartex.com/docs/api/) or the [Swagger page](https://app.heartex.com/swagger). 
- Fixed an issue where users’ changes to the Labeling Interface Settings were not being saved. 
- Fixed a performance issue when using mouse clicks to interact with OCR regions that have large numbers (>50) of bounding boxes. 
- Fixed an issue where Admin users who were assigned the Reviewer role in a project (using the SCIM project-role mapping) were seeing their own annotations in the review stream for the project. 
- Fixed an issue where organization-level roles rather than project-level roles were being reflected in project cards. 
- Fixed an issue to ensure that project-level role mapping is removed when the associated SCIM and SAML mappings are removed. 
- Fixed an issue with login page indexing that was preventing users from being added to projects. 
- Fixed an issue where the predictions counter was not correct when using project-level role mapping. 




</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2410md"></a>

## Label Studio Enterprise 2.4.10

<div class="onprem-highlight">Contextual scrolling for audio and video, search field on the Projects page, autocomplete prompt when editing the labeling configuration</div>

*Sep 13, 2023*


### New features

- Contextual scrolling allows you to sync your text transcripts with their corresponding audio or video. When enabled, the text transcript automatically scrolls to the new listening point as the media plays. This is now the default mode for the Conversation Analysis template.
    
    For more information, see the [Contextual Scrolling template documentation](https://docs.humansignal.com/templates/contextual_scrolling).

    ![Screenshot of an audio file with contextual scrolling](/images/releases/2-4-10-scrolling.png)
    
- There is a new search field on the Projects page. You can use this field to search project titles. It can also be used with the project filters. For more information, see [Search projects](https://docs.humansignal.com/guide/manage_projects#Search-projects). 

    ![Screenshot of the search field on the Projects page](/images/releases/2-4-10-search.png)

- When working with the labeling configuration code editor, you will now see an autocomplete prompt that lists and defines possible tags and parameters. 

    ![Screenshot of the autocomplete feature in action](/images/releases/2-4-10-autocomplete.png)
    
- You can now use the API to filter [projects by title](https://app.heartex.com/docs/api/#tag/Projects/operation/api_projects_list). 
- There is a new **Drafts** column available in the Data Manager. You can also filter and sort by this column.
    
    ![Screenshot of the Drafts column in the Data Manager](/images/releases/2-4-10-drafts.png)

### Enhancements

- When using an LLM-based ML backend, the `<TextArea>` tag now supports chat mode. You can send a prompt and receive a response to populate your TextArea inputs. 
- New tooltips throughout the UI provide guidance on advanced features and configurations to improve labeling efficiency and quality. 
- Label distribution now shows the number of labels instead of the percentage. 
- Deactivated user pages now include contact information. 
- For organizations using SSO, you can now disable regular logins for your users. 
- The project migration script has been improved to ensure that annotation history, annotation reviews, and drafts are migrated appropriately. 
- You should see improved performance in multiple API calls due to optimization work related to data handling and loading.  
- Improved exact frames matching, including adjusting BBox impact weight and improved basic matching for more accurate consensus scores. 
- Several design improvements to project dashboards:
    - Progress bars are now clearer. 
    - Task Pending Review and Annotated Tasks indicators now have labels for better clarity. 

### Security

This release addresses a vulnerability regarding how SECRET_KEY is set.

- The SECRET_KEY is now configurable through an environment variable. **Users are strongly encouraged to set SECRET_KEY to a random secret of their choosing.** A fallback SECRET_KEY is specified by default, but will be removed in a future version.
- Older versions also included a vulnerability in which the secret key could be leaked via identity provider callbacks. This release patches that vulnerability.
- **Helm Chart update**: Version 1.2.0 is now available. This version includes automatic generation of a random SECRET_KEY, which also populates a Kubernetes secret. No manual setting required. [See the full changelog here](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/CHANGELOG.md). 

### Bug fixes

- Fixed an issue where all users in an organization were listed in the drop-down filter for annotators, rather than just users within that project. 
- Fixed an issue where when saving a labeling configuration, users were redirected to the Data Manager. 
- Fixed an issue where some users were unable to log in via LDAP due to TLS cypher settings. 
- Fixed an issue where FileProxy was blocking local IPs. 
- Fixed an issue where labels were missing from the Outliner UI when labels from different tags were applied to the same text span.
- Fixed an issue that was preventing users from changing labels. 
- Fixed an issue affecting split channel audio. 
- Fixed an issue where the show/hide icon was not appearing when working in regions that were grouped by tools. 
- Fixed an issue where the number of completed tasks listed on the All Projects page displayed an incorrect value in situations where the project is duplicated. 
- Fixed an issue where the Project page was making unnecessary API calls. 
- Fixed an issue where `is_labeled` was being miscalculated. 
- Fixed an issue where filtering by annotation results in the Data Manager was causing errors. 
- Fixed an issue with RichText tags when using non-Chromium browsers. 
- Fixed an issue that occurred when users selected keypoints and polygons within the same annotation. 
- Fixed an issue where users were able to import unsupported file types.
- Fixed an issue where there wasn’t sufficient spacing between the Author filter and the first paragraph. 
- Fixed a double encoding issue with file-proxy URLs. 
- Fixed an issue where the Move and Pan icons were missing in the Create Project preview. 
- Fixed an issue where the workspace overflow menus were visible even when the user was not hovering over the workspace name. 
- Fixed an issue where DB deadlocks were occurring due to lengthy transactions. 
- Fixed an issue where pushing a SCIM group would automatically create a workspace named after that group, which should not happen in cases where a role to group mapping already exists. 
- Fixed an issue where the date picker on project dashboards was being incorrectly calculated. 
- Fixed an issue where a large empty space was appearing at the bottom of the Workspaces page. 
- Fixed an issue where users were unable to edit label configurations for Natural Language Processing groups. 
- Fixed an issue with column naming collisions in certain API responses. 
- Fixed an issue where, when using an ML backend, the model version was not displaying in the Data Manager despite being explicitly set. 
- Fixed an issue where pressing Escape would not close the Create Project modal. 
- Fixed an issue where annotators were able to archive workspaces. This should be restricted to owners, managers, and admins. 
- Fixed issues to ensure more robust and uniform SSRF defenses.
- Fixed an issue where organization names were improperly appearing in error logs. 
- Fixed numerous issues related to Text and HyperText that affected performance and usability. 
- Fixed several issues to improve region tree responsiveness. 
- Fixed an issue where clicking an annotator’s profile picture would throw an error due to `displayName` being undefined or when user references were stale. 
- Fixed an issue where roles were not being checked for task assignments. 
- Fixed an issue where annotators were able to access tasks to which they were not assigned. 
- Fixed an issue causing deadlocks on task import when running parallel jobs. 





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="249-7md"></a>

## Label Studio Enterprise 2.4.9-7

<div class="onprem-highlight">Bug fixes</div>

*Aug 22, 2023*

### Bug fixes
- Fixed double encoding issue with file-proxy urls

### Security
- GH 4483 (in Label Studio repo) made existing SSRF defenses more robust






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="249-6md"></a>

## Label Studio Enterprise 2.4.9-6

<div class="onprem-highlight">Bug fixes</div>

*Aug 21, 2023*

### Bug fixes
- Fixed the splitchannel audio option.
- Fixes SCIM group push so workspaces are not created from groups if role to group mappings already exist.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="249-5md"></a>

## Label Studio Enterprise 2.4.9-5

<div class="onprem-highlight">Bug fix</div>

*Aug 11, 2023*

### Bug fixes
- Fixed an issue where pre-signed urls could become double encoded and break signatures.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="249-4md"></a>

## Label Studio Enterprise 2.4.9-4

<div class="onprem-highlight">Draft column in the Data Manager</div>

*Aug 04, 2023*
<!-- Release notes generated using configuration in .github/release.yml at lse-release/2.4.9 -->

### New features

Add Draft Column to the Data Manager

### Bug fixes

* Fixed a TLS issue for older LDAPs.







</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="249-2md"></a>

## Label Studio Enterprise 2.4.9-2

<div class="onprem-highlight">New workspace actions, per-image classifications</div>

*July 26, 2023*

### New features
- Workspaces now have a drop down option to allow you to edit, delete, and archive them. This enables you to hide workspaces from view while still allowing access to those workspaces as-needed
- Per-image classifications are now available. You can use the perItem parameter of classification control tags in Multi-Image Segmentation cases to attach classification to separate images in the set. For now it is supported by `DateTime`, `Number`, `Choices`, `Taxonomy`, `Rating` and `Textarea`

### Enhancements
- Fixed medium vulnerabilities for Vanta
- Print more descriptive debug messages for SAML configuration errors on an error page
- Consistent feature flags for all products
- New disabled state on date picker buttons

### Bug fixes
- Fixed issue with 3-point rectangle too that it didn't work with relative coords
- After selecting several tasks in data manager, reviewers get "URL too long" error
- Persist collapse state of side panels
- Evalme in rqworkers uses error level for logging always
- Fixed issue where the user is able to move a region even when it's locked
- When "Must leave a comment" is selected, the comments tab will come to focus
- Fixed relation hotkeys so that they work with and without relation action buttons
- Fixed the inability to modify regions which were initially beneath another
- Fixed sorting by signed numeric values
- Current draft version is NOT always saved after clicking the 'Postpone' button
- Fixed issue with selecting hidden regions by selection tool
- Fixed issue with unavailable regions inside selection area
- Load Predictions + Dynamic Labels properly, unknown labels are not removed from results now
- Disallow users from adding users from other organizations to their project
- Fixes issue where ReviewStream task navigation buttons were missing
- Fixed data import with SDK and async import
- Inconsistent behavior when adding New project to the archived workspace
- Tooltip is missing when expanding / collapsing "Archived Workspaces" section





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="248-1md"></a>

## Label Studio Enterprise 2.4.8-1

<div class="onprem-highlight">Bug fix</div>

*Jun 26, 2023*

### Bug fixes
- Fix Review N Tasks with URI too long






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="248md"></a>

## Label Studio Enterprise 2.4.8

<div class="onprem-highlight">Enhanced UI for panels and tabs, new Ranker tag, new Outliner filter, async imports</div>

*Jun 16, 2023*

### New features
- Panels now have tabs that can be moved between panels by dragging or can become panels themselves. Panels can also now be stacked, resized, collapsed, and reordered
- Support for Ranker tag validation and sample data from the API
- New outliner filter for improved efficiency and navigation
- Annotation tabs to better split out and manage tasks
- Target storage successfully validates unexisting buckets
- Make imports asynchronously to ensure stability on the server requests

### Enhancements
- Add Generative AI templates to Label Studio
- Remove export and conversion files from storage when related export snapshot is deleted
- Optimize requests made for pre-signing cloud storage urls
- Add labeling config templates for Ranker tag
- Annotation selection is now handled using a carousel instead of a dropdown
- Enhance cloud storages with progress tracking and status information for improved monitoring and debugging
- Add Backend API for Label Distribution chart
- Confidence score to be displayed all the time on regions
- Forward and back buttons on all views, different roles have different interface buttons available
- New defaults for panels and tabs
- New List+Ranker tags that work in tandem to display and rearrange list of items
- Show agreement column to reviewers in DM
- DataManager default width should be equal to the main menu width in Quick View
- Upgrade to NodeJS LTS
-  parameter for . You can now use  parameter for  tag.  It allows the display of additional information for the each item when you hover over it. This works for both '<Choices/>' and '<Taxonomy/>' tags as a containers
- Change the quick view column button
- Improvement to the user general settings modal to align with the new labelling UI changes
- Annotation Tab Button
- Conditional annotation with visibleWhen choice-selected works with Taxonomy
- Annotation instructions are a modal instead of a top bar
- Change LSF linter to target changed files only

### Bug fixes
- Fix CORS errors when accessing previously valid urls
- Fix issue with missed Hide all regions button
- Check Connection for Azure storage doesn't actually check connection
- Add validation for min/max params in DateTime
- Project duplication saves updated description
- Fix duplicated workspaces when SAML workspace mapping is used
- Fix issue with possibility of missing dynamic children of Taxonomy
- Update wheel, django and sub-dependencies to address security vulnerabilities
- Labels in drafts now also using for config validation
- Duplication of tasks at first sync
- Fix OOM during target storage export
- Error from_name in draft saving
- Fix statistics calculation for paragraph labels with  spans
- Fix an issue with missed timestamps while zooming Time Series with huge data
- Fix empty stream with show_overlap_first enabled
- Improve project list performance by requesting less data in all requests
- Fix an issue when Brush tool completely crashes UI if it's defined before the image it's attached to
- Fix expanding/ collapsing Quick View side-panel to prevent reversion of annotations to the top of the undo stack
- Reset button now successfully resets the time field
- Fix side-panel spacing in view all mode
- Remove bottom bar in view all
- Copy formatting respected in initial instructions modal
- Time is now consistent between date time sessions
- Outliner manual group sort order arrow
- Project duplication correctly copies over the annotation setting to require leaving a comment on skip
- Fix an issue with using local file upload with cloud storage urls causing errors
- Project duplication correctly copies over the quality setting for annotation agreement metric name
- Activities of a Member is being Tracked across multiple LSE Organization
- Dashboard start and end have time by default
- Sort annotations by creation time
- New regions are handled in the filters
- Tooltip is missing when hovering over Confidence score value
- Fixed an issue with interpolating a video region rotation prop
- Center justify text on last step of sign up
- PreNotification is_processed_for_* index
- Fix audio and video sync issues with alternative audio player webaudio
- Fixed tab switch on breakpoints, prevent dragging to collapsed groups, allow line breaks in info modal, prevent panel revert on screen size change
- Fix documentation for Ranker
- Navigate between tabs in the side panels doesn't reset the postpone button state
- Prediction results cannot be displayed immediately
- Update the MIG feature flag to match the naming convention
- Improve interactions and feedback on date and time fields of the date time picker
- Fix a script incompatibility causing API docs to not load
- Fix any unhandled errors with pre-signed proxy urls
- Fix image vulnerability: CVE-2023-31047
- New feature of the parameter skipDuplicates of TextArea allows to keep submissions unique while editing existing results
- Fix runtime error whenever a user deletes a source annotation and proceeds to submit/update the duplicate
- Validate doesn't work for export storage
- Add hover state to panel header, improved buttons for collapse and expand
- Always display correct author of draft when user check others' comments
- Annotation tab annotator name line height not per specs
- Fix inconsistency in the display of the region item lock and hide controls
- Keep the created at timestamp of an associated annotation to its saved draft
- Fix toggle selected region visibility using hotkey (Alt + H)
- Fix icons in TopBar
- Always use time even if not provided on kpi api calls
-  removes the ability for patch requests to update user email
- 'PDF Classification' classification template is displayed twice
- A fix for the date-time picker calendar to prevent the selection of all available dates when the user clicks and drags
- Handle AWS CORS implementation edge cases for images
- Support predictions for Ranker
- Migrate the rest of the system to Yarn
- Insufficient Protection Against Malicious Software
- Fix XSS in wrong task data
- Shorten ordered by title in outliner to allow for filters





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="247md"></a>

## Label Studio Enterprise 2.4.7

<div class="onprem-highlight">Updated content for empty project pages, UI changes for async export conversion</div>

*May 18, 2023*

### New features
- Update content when users don't have any projects created yet

### Enhancements
- UI changes to support async export conversion.

### Bug fixes
- Validate email domains for trial signups only
- Limit export number for api/project/id/exports for better performance
- CSV and TSV exports work incorrectly with JSONs and tab/commas/others symbols in labeling
- Fixed an issue with null appearing while using video config
- Conversion of project exports are now async






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="246-1md"></a>

## Label Studio Enterprise 2.4.6-1

<div class="onprem-highlight">Bug fix</div>

*May 09, 2023*

### Bug fixes
- Fixes an issue with using local file upload with cloud storage urls causing errors.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="246md"></a>

## Label Studio Enterprise 2.4.6

<div class="onprem-highlight">Data Manager actions for reviewers, better placement for annotation instructions, allow email lists when inviting users</div>

*Apr 27, 2023*

### Enhancements
- Show DM actions to reviewers (works only with feature flag, contact your customer success manager to have it enabled)
- Annotation instructions are a modal instead of a top bar
- Allow to use list of emails in Members Invitation dialog
- AnnotationHistory should be removable via API

### Bug fixes
- No review object in review webhook payload
- Properly handle missing keywords: reviewed
- Hidden video regions do not move when adding new visible regions above
- Scroll to image regions if needed, but don’t scroll unnecessarily (UX improved)






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="245md"></a>

## Label Studio Enterprise 2.4.5

<div class="onprem-highlight">Performance optimization for projects API, storage link resolver for nested task data fields</div>

*Apr 10, 2023*

### Enhancements
- Performance optimization for api/projects with task number
- Storage link resolver in nested task data fields

### Bug fixes
- Fixed a problem where filtering by empty or not empty in annotation results and prediction results would not work
- Start, end and offset of paragraph selection should not include empty or newline 
- Fixed an issue with regrouping regions after annotations switching
- Opening video in tasks should not trigger a CORS issue in HEAD response
- Can't patch tasks when task data has a taxonomy null-values
- Fix error on duplicating Project with external storage when it wasn't synced
- Improved filetype playable detection for video sources 
- Proper unhandled exceptions processing in *_from_request functions. Activity log middleware fix for project id. Warning: Some of 500 errors about validation are 400 errors now.
- CORS errors on valid audio files occur sometimes when accessed in succession
- Fix Video Rectangles to display while drawing
- Fixed import several tasks from one csv file






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="244md"></a>

## Label Studio Enterprise 2.4.4
<div class="onprem-highlight"><code>skipDuplicates</code> parameter for TextArea, audio v3 Web Audio alternative decoder option, S3 custom endpoint for persistent storage </div>

### New features
- New parameter skipDuplicates of TextArea allows to keep submissions unique.

### Enhancements
- Audio v3 webaudio alternative decoder option
- S3 custom endpoint support for persistent storage
- Table tag ordering items alphabetically

### Bug fixes
- Fix DM columns visual problems
- Fix column sizes on datamanager
- Hiding an audio region allows selection of regions below.
- Fix Intersection over 1d timeseries spans agreement calculation for Time series

- Fixes playback micro-stutters for Video Timeline Segmentation.
- Add error handlers like it is for AudioV1
- Don't let ghost regions be created
- AttributeError: 'GCSExportStorage' object has no attribute 'links_count'
- Disable file proxy for cloud using FILE_PROXY_ENABLED environment variable
- Audio playback and playhead remain in sync.





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="243md"></a>

## Label Studio Enterprise 2.4.3

<div class="onprem-highlight">New <code>splitchannels</code> option on audio configs, keyboard shortcuts for the Data Manager, restore locked annotations</div>

### Enhancements
- Support simultaneous render of multi-channel audio with added splitchannels="true" option on Audio config (larger memory requirement)
- Allow selecting task automatically on Data Manager page whenever the user presses shift+up/down
- Restore locked annotations
- Navigation back to previous tasks in labeling stream is now persistent against page reloads and user labeling sessions
- Add sync update of is_labeled field
- Improved responsiveness for image regions selection

### Bug fixes
- Fixed bug with presigned TTL setting in cloud storage connection being not persistent
- Slider follows the positional seeker in video when using the step forward or backward buttons.
- Now it is possible to retrieve the list of uploaded files with `api/projects/<project-id>/file-uploads&all=true` request
- Improved performance for projects page and annotation-related API
- Setting - Quality - Custom weights: UI too limited
- Wrong xpath in annotation result (remove FF)
- Fixed an issue with missed step of setting password for invited users
- AnnotationReview stats are calculated in 2 separate jobs
- Task data with dicts in array are incorrectly resolved
- Fixed authorization check for roles change
- Prevent persistent Cross-Site Scripting (XSS) in Activity Log
- Fixed issue with saving empty drafts
- Unclear error about unknown tag
- Migration for fixing organization id in activity logs
- The first Audio V3 region created is not added to the undo stack





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="242md"></a>

## Label Studio Enterprise 2.4.2

<div class="onprem-highlight">Label placement change for regions, YOLO support for PolygonLabels</div>

### New features
- Labels are not displayed inside the regions
- Add YOLO support for PolygonLabels in export options

### Enhancements
- Backend: Update invite url to send user to new password page
- Postpone button is disabled if there is no new comments on label steam
- Rendering performance improvements for large-duration audio
- Variable frame rate for videos using frameRate="$fps" doesn't work
- Display correct docs links in LSE/LS

### Bug fixes
- User can resize bbox as he wants if ImageView is zoomed.
- Fixed issue with keeping zoom position on resize of working area
- Fix appearance of all the connected labels to region in Details view
- Text and HyperText elements can be added without value and name
- Datetime annotation produces empty payload for the value: {}
- Page breaks on completing audio Annotation (when using large audio files in a ParagraphLabels project)
- In data manager UI, the moving and resize are mixed, resize is not usable
- Postpone mode reverts task back and forces user to create 10 annotations in a row
- Quick View breaks when navigating between annotations
- Video zoom doesn't follow the cursor pointer location
- Task locks missed in postponed / skipped queue
- Taxonomy titles clash (reappearing bug)
- Administrator can't be removed from project members
- Four digits added at the end of image file_name in outputted COCO jsons  
- Optimize memory and speed during exports
- maxUsages for KeyPointLabels and RectangleLabels doesn't work
- Fixed an issue with backspace hotkey in Audio
- Import jobs are submitted twice (or more) times
- Details section layout is broken when long named labels are used 
- Second click on label unselects it and creates 'No label'
- Fix missing tasks in Data Manager upon upload
- Region is selected when user drag the region
- Saving model version on Machine Learning settings doesn't work





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="241md"></a>

## Label Studio Enterprise 2.4.1
<div class="onprem-highlight">Improved logging, API for project annotation history</div>

### New features and enhancements 
- Add project annotation history API
- Improve logging

### Bug fixes
- Fix anonymize annotators while reviewing
- Unrelated organizations can view Roles from another organizations
- Remove unused task lock ttl settings
- Fixed issue with displaying history in review after View All
- Readonly regions should always be selectable.
- Fix agreement calculation for Taxonomy with custom labels
- Restrict tabs deletion for reviewers
- Fixed issue with hotkeys of dynamic children
- Add validation for required toName parameter on TextArea
- Fix project cloning with cloud storages tasks
- Add filters by columns, datetime range filter and ordering to activity log
- Add project annotation history API
- Logs error: AttributeError: 'Task' object has no attribute 'get_lock_ttl'
- Enable player head time input and change the way that it was working
- Switch level of next task log messages
- Fix log message
- Fix layout in Preview for small content configs panels now are pinned to the bottom
- Prevent annotations duplicating in Label Stream
- Fix status code for not found task to 404 in tasks API
- Text and HyperText elements should have value and name properties
- Fixed issues in following  cursor pointer during video zooming
- Task locks in postponed/skipped queue
- Prevent annotation duplicates when 'Re-queue skipped tasks back to the annotator' parameter is selected
- Add Google project ID to Source/Target GCS form




</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="240md"></a>

## Label Studio Enterprise 2.4.0

<div class="onprem-highlight">Audio player enhancements, comments and notifications improvements, support for numpad hotkeys</div>

This section highlights the new features and enhancements, and bug fixes in Label Studio Enterprise 2.4.

### New features and enhancements 
- The [Comments and Notifications](/guide/comments_notifications.html) feature allows you to discuss task issues and other problems during labeling and reviewing processes.
- The new Audio Player feature provides a new configurable UI that improves the audio labeling efficiency and usability.
- Add `updated_at` field to comments API.
- Cancel old import jobs when a new one is created.
- Support for numpad hotkeys (letter/number keys and keyboard shortcuts) that allows you to label or classify the materials faster in productivity/metrics.
- Support for environment files from Vault ca-injector.


### Bug fixes
- Accept/Reject action does not update `updated_by` field of task.
- Fixed the `terms of service` link on sign up page.
- Fixed an issue where the notification about annotator's comment in draft was not sent to anyone.
- Show/hide toggle on the Outliner worked with all region types.
- Used Hotkey for label assignment to selected regions (`rectanglelabels`, `polygonlabels`,`keypoints`, `brushes`, `audio`, `timeseries`, `text`, `html`, `paragraph`, and so on).
- Added boundaries that limited the working area for video regions.
- Fixed an issue where CSV exports incorrectly serialized complex data types.
- Fixed the **Show labels inside the regions** option to work in the video template.
- Fixed import tasks data validation for nested fields with repeater.
- Fixed an issue when clicking the **Update** button in Label Stream lead the annotator to the next task.
- Comments were associated with the current draft even when the draft was in pending save state.
- Comment edited session state was displayed accurately in the updated form. (For example, `Updated 10 minutes ago`).
- Fixed an issue with the **Review** stream performance optimization.
- Fixed errors on task switching after notification link.
- Fixed an issue where the lack of network connection caused infinite loop of requests.
- Resolved an issue for read-only file system (FS).
- Fixed an issue where the Google Cloud Storage (GCS) persistent storage was broken.
- Fixed the issue with spam requests.
- Avoided the creation of `pg_trgm` in Postgres if it existed.
- Fixed review stream tasks ordering.
- Informed users about invalidated control tag names when there was a mismatch between labels in configuration and labels in data.
- Fixed CSV export when a few rows did not have the column values.
- Unfinished regions were easily detected using the sidebar or outliner so they were completed before the task was submitted.
- Changed color when a user changed the label.
- Removed `MEDIA_URL` from the uploaded file path.
- Improved the initialization of annotation configurations to reduce the memory used by complex cases such as the `Repeater` tag.
- Set the numbering of the first frame of the video timeline to be consistent.
- Fixed page crashes with enabled **Interactive View All** mode for review.
- Added a fix for read-only file structure (FS).
- GCS persistent storage was broken.
- Fixed the issue with data corruption using region manual editing through the **Details** panel.
- Fixed the issue with spam requests.
- Failed export in CSV: UnicodeEncodeError: `ASCII` codec failed to encode character.
- Fixed `update_tasks_counters` call with DM filters.
- Review statistics on the dashboard were correct when the feedback loop was enabled, and the reviewing options for the Reviewed counter on Dashboard were counted.
- Fixed dashboard-members API with "action=updated" for annotation review.
- Improved project duplication speed.
- Admin users were not able to access the project activity logs.
- Resolved a visual bug affecting overflowing text that passed the sidebar on the right.
- Fixed annotation disappears on undo.
- Fixed the `showSubmitButton="false"` to work correctly.
- Removed WASD (W, A, S, and D represent up, left, down, and right) shortcuts from DM navigation.
- Avoided the creation of `pg_trgm` in Postgres if it already existed.
- Added test coverage for new project template functionality.
- Users were able to pan images if an annotation history item was selected.
- Correctly undo actions over the fresh loaded draft with audio.
- Fixed label configuration validation for several `Choices` tags in a single view.
- Allowed clearing `DateTime` values.
- Exported consistency check.
- Fixed an issue where the Outliner grouping changed when the task annotations were changed.
- Fixed the issue with the inability to change the S3 session token once set.
- Filtered with the specific annotator worked very slowly.
- Added validation for project name length in duplicate dialog.
- Disabled task counter in **Label** or **Review** stream.
- Downloaded storage empty path.
- Fixed the broken **Review** stream on the second task using Audio v3.
- SSO failed to work with capitalized emails. Use this environment variable to enable autofix: `ALLOW_FIX_LOWERCASE_USER=true`.
- Removed duplicated PDF template.
- Supported copying regions in the Outliner.
- Fixed an issue with undoing closed polygons by Hotkey.
- Time Series truncate signal and triangle marks disappeared.
- SCIM was broken and always returned a logout page.
- Filtering failed to work for Annotation results.
- Returned `400` bad requests on incorrect XML.




</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="231md"></a>

## Label Studio Enterprise 2.3.1

<div class="onprem-highlight">New helm chart, multiple usability enhancements, including new Data Manager columns and the ability to duplicate projects</div>

This section highlights the breaking changes, new features and enhancements, and bug fixes in Label Studio Enterprise 2.3.1.

### New helm chart

A common chart for LS and LSE has been released and is available as of LSE version 2.3.x. The chart can be accessed at the following repository: https://github.com/HumanSignal/charts/tree/master/heartex/label-studio.

#### Migration Process

The migration process can be performed without any downtime. The steps required to carry out the migration are documented in the migration guide, available at: https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/FAQs.md#label-studio-enterprise-upgrade-from-decommissioned-label-studio-enterprise-helm-chart.

### Breaking changes
Label Studio Enterprise 2.3.1 includes the following breaking change:

-  This release moves Nginx to a sidecar container.
-  After the announcement in LSE 2.2.9, Minio was still supported. Now, this release finally decommissions MinIO as a service.

### New features and enhancements 
Label Studio Enterprise 2.3.1 introduces the following new features and enhancements.

- Allows annotators and reviewers to filter the view of transcriptions by author name.
- Improve project list performance by hydrating counters in a second request.
- Project duplication interface that allows users to copy projects with settings, tasks, and annotations.
- Introduce the project pinning interface that allows users to pin projects for better visibility of commonly referenced projects.
- Duplication of tasks and annotations in project duplication API.
- Navigate taxonomy with arrow keys, Up/Down to navigate, Right to open subtree, Space to select item; also important fixes for multi-lines and interactions.
- Add user notification about Storage Persistence availability.
- Implement new columns for the commentary system: **comment count**, **unresolved comment count**, **comment authors**, **last comment date**.
- Introduce size presets to zoom an image to fit within the viewport or to have it at its natural size (up to available space in viewport). With this release, you can now set the image to be positioned vertically (top, center, bottom) and horizontally (left, center, right).
- Introduce comments system for communication between Annotators and Reviewers. Allows a Reviewer to mark comments as resolved. Comments feature also introduces new columns in the Data Manager to be able to filter tasks by comments inside.
- Add workspace grouping for Annotators, displaying the Workspaces where they are the members.
- Display drop-down with model versions for each machine learning backend.
- Change in rotate anchor that is no longer out of the Bbox and now are close to all resize anchors.
- Add Label weights settings section in **Settings** >> **Quality**.
- Add date and action filters for dashboard data.
- Support `PosixGroupType` for LDAP.
- Add Paragraphs to substring_matching example.
- Update the invite people modal to include invite by email.
- Add **Resend** and **Revoke** invitation buttons to **Organization** page when a user is selected.
- Update the organization role drop-down visual to show an indicator for inactive users.
- Update welcome emails on signup verification and invites.
- Add the ability to sustain the collapse state of the label across tasks and maintain consistency in the order of the label groups.
- Cleanup lambda custom-metrics if it's not required.
- Add cron jobs to verify trial expiration.
- Export command for open source using console.
- Block the entire screen by a non-closable modal window only when the trial ends.
- Add option to synchronize audio with paragraphs allowing playback of chunk position.
- Support a custom column order with draggable columns.
- Support notifications links in Label Stream and Review Stream.
- Add links to annotations in notifications.
- Enable manual mode for assigning Reviewers to tasks.
- Introduce new attributes for the `<Audio/>` tag: `defaultZoom`, `defaultSpeed` and `defaultVolume`.
- Add simpler hotkeys to jump between frames in the Video Segmentation scenario.
- Add video metric with intersection for interpolated frames.
- New comment behavior for Submit/Update/Skip/Accept/Reject buttons.
- Support Django GCS with signed URLs without service account token creator permission.
- Add the video type support and video preview to the Data Manager.
- Add a list of supported video formats.
- Allow negative timeseries data and additional customization options to visualization.
- Introduce new Video settings in the Labeling Interface to allow changing the hop size.
- Add Multi-page document annotations template with `<Repeater>` example among the template gallery.
- Inactive users now show `Never` in the **Last Activity** column of the organization table instead of the date they were invited.
- Improve revoke invite UX so it's consistent when used from the selected user section and the revoke invite button in the dropdown in User list.
- Annotator's Data Manager filters persist between page navigation.
- Run `api/workspaces?user_email=xxx` API call to return the list of workspaces.
- The region navigation now works in scrolling (list) mode.

### Bug fixes
Label Studio 2.3.1 includes the following bug fixes:

- Fixed an issue where unfinished polygons should save as draft and remain in open state if left unclosed.
- Retained history on initial load of annotation review stream.
- Fixed workspace filter for project list API.
- Displayed source filename for tasks from storage in a separate column.
- Fixed "Tasks per page" field that should be in sync with the number of tasks displayed.
- Fixed an issue where **Quick View** failed to open when the user attempted to copy-paste its URL to another tab.
- Deselected image region Bbox on short click.
- Fixed the behavior of the drop-down menu that wasn't grouping when the organization wasn't activated  .
- Added a change in rotate anchor that was no longer out of the Bbox and currently close to all resize anchors.
- Prevented users from being able to edit fields that are not meant to be editable.
- Multiple rendered labels in regions.
- Fixed an issue where the relationship delete button wasn't working as intended.
- Ensured `review_settings` was included in the initial request.
- New `DateTime` tag for date, date time, or year that can be conditionally rendered.
- Allowed annotators and reviewers to filter view of transcriptions by author name.
- Added ability to delete points with an alt click..
- Allowed users to pin/unpin projects to more easily filter and find projects of interest.
- Fixed `PyJWT` vulnerability.
- `get_local_path` doesn't work for local-files in ML backends and converters.
- Hold to continuously draw image view shapes should work with DEV-1442 enabled.
- Skipped tasks are placed in the beginning of the label stream, however they should go at the end
- Added agreement calculation for `Datetime` tag.
- Speed up **Members** page in case of big annotations.
- Resolved an error where the 3 point Bbox would remain usable after removing rectangles from the labeling configuration.
- Fixed an issue where the imported annotation was marked as read-only, but allowed users to make changes anyway.
- Fixed UX and behavior when expanding/collapsing the panels and unsnapping/snapping to the sides.
- Displayed drop-down with model versions for each machine learning backend.
- Updated Django to 3.2.14.
- Fixed broken default page number for non-admin accounts on Projects page.
- User could not edit `VideoRectangle` when it was locked.
- Fixed an issue when a user can resize a panel in such a way that it obscures all the underlying content.
- Fixed clashed text entries for multi-value TextArea.
- Fixed an issue when selection is still active after hiding an Image region.
- Fixed an issue when selection is broken after showing previously hidden selected region.
- Added columns for comment management in the Data Manager: **Comment count**, **unresolved comment count**, **comment authors**, and **last comment date**.
- Prevented polygon being duplicated when finishing drawing.
- Implemented new columns for the commentary system: comment count, unresolved comment count, comment authors, last comment date.
- Locked polygons don't show the editable points any longer.
- Removed validation for new data fields in label config.
- Fixed the issue when grouping by empty label caused the app to crash completely.
- Fixed an issue when Audio regions were displaced due to zoom/viewport size.
- Fixed an issue when panels can fall out of the viewport if the viewport's size changed.
- Recalculated overlap when changing overlap to 1 and changing enforce overlap.
- Fixed user's inability to hide regions within the NER scenario.
- Added a unique constraint for workspace members.
- Fixed UX issue with an almost invisible text area in a region list when the region is selected.
- Fixed app crash with Author Filter for Paragraphs enabled.
- Fixed an issue when the text captured by a region was not displayed in the **Details** panel.
- Resolved an issue affecting the tooltip of the flyout menu tooltips on small screens.
- Disabled the delete button when previewing the historic item.
- Showed indeterminate loading when project duplication is in progress.
- Unfinished polygon region was not auto-completed when the user moved it.
- Annotation region locking should not persist.
- Changed environment variable for enforcing local URL check for ML backend.
- Can't upload data without annotation history
- Fixed an issue when the selected **Annotation History** item was not rendered on the canvas.
- Increased external storage sync job timeout.
- Label weight was not reset after Labels change.
- Project list had project duplicates.
- Fixed an issue where a missing empty body was generated for 204 responses.
- Broken "All Projects" pagination.
- Fixed an issue with paragraph regions that were not selectable within the new Outliner.
- Fixed configuration validation for Repeater tag.
- Implemented lazyload on image to improve loading performance.
- Improved polygon point removal during drawing: you can use usual undo hotkeys (ctrl/cmd+z) to remove the point you just set or redo it if you want (ctrl/cmd+shift+z).
- Fixed an issue with displaying Annotation History in LSC.
- **Details** panel was automatically updating on lock action.
- Disabled error for label configuration validation with <!DOCTYPE> tag.
- Showed list of new users created using API correctly.
- Added the Talk to an expert modal.
- Added a minor correction to invite/revoke button text.
- Cleaned up logging, excluding potential security concerns related to sensitive data exposure.
- Resolved an issue that added an entry to the annotation history when zoom was changed.
- Project list card requests used wrong Feature Flags.
- Fixed an issue when the text captured by a region was not displayed in the **Details** panel.
- `settings.HOSTNAME` for password reset.
- Corrected an error where clearing the email field in Ask an expert modal would still allow a successful commit
- Added validation to avoid users import local files using URL
- Invite modal when opened from ribbon refreshed the **Organization** page on for submit if opened on that page.
- Fixed issue when selecting the region will cause region update and changes history to record new change.
- Added updated_by to dashboard API
- The Undo functionality for video labels was broken by the Show/Hide/Lock/Unlock actions.
- Improved delete tasks action speed.
- Fixed an issue when locking UI disappeared when "trial days" is negative.
- Fixed an issue when the image shrinks in certain cases.
- Logout menu displayed in smaller screens.
- Turned off lambda prefix and tags for cloud instance.
- Fixed a bug where the loader would appear when user list is empty
- Tasks were not updated after filter field changed in DM
- Fixed an issue when Sentry cannot properly capture Frontend exceptions.
- Excluded Deactivated/Not Activated users from project dashboards and member assignments lists.
- Checked user limit for invites.
- Deleted tasks were not working with some ordering (e.g. by annotators).
- Prevented the annotating collapsed phrases in paragraphs.
- Fixed tabs being randomly mixed after label stream.
- helm: Fixed support for Google project ids with only digits in name.
- Detached menu style update.
- **Copy to clipboard** icon was replaced with **Copied to clipboard** icon (green check-mark in circle) when an user clicked on it.
- Cannot change the user role for a user that had their invitation revoked.
- Sort order of regions grouped by labels was now based on label order + collapsed state persists through page load.
- Fixed tag template.
- Exact matching for attached tags (choices, numbers) ignored the labels spans.
- Fixed region grouping in Outliner.
- Fixed gaps on image borders on different screen sizes which may lead to slight region subpixel shifts.
- Show region index in Outliner to distinguish regions.
- Temporarily disabled the full-screen mode for video.
- Fixed Completed field in case maximum annotations change after overlap change.
- Created the possibility to enable pagination in the repeater for performance improvement.
- Added more error information when ML backend validation has failed.
- Allowed frames scrubbing on the timeline.
- Moved the video zoom button from the top to the controls section.
- Allowed video playhead/seeker scrubbing.
- Fixed an issue when `TextArea` placement in the config prevents video annotation.
- When a page was selected from a region, the item per page was changed to 1 and the selected item was displayed.
- `labels` to textarea result was not added.
- Fixed syncing data with invalid annotations or predictions.
- Fixed an issue when the user was unable to pan an image that was smaller than a viewport.
- Resolved an issue affecting filters.
- Switching to drawing tools during the process of drawing a new region was not supported.
- Fixed initial audio region history state.
- Fixed an error caused by expecting a field that doesn't always exist
- Fixed video regions w/o label
- Showed unsupported video format error message if not supported.
- Data manager broke when the annotator was deactivated.
- Resolved an obscure issue that can occur when changing `defaultZoom`, `defaultVolume` or `defaultSpeed` in Audio tag while working with Video Timeline Segmentation.
- Fixed video configuration validation.
- Resolved a pagination error on Data Manager.
- Fixed an issue with shifting image regions at different window sizes.
- Fixed annotator's data manager filters to persist through page reload.
- Added `CreateOnlyFieldsMixin` to `BaseUserSerializer` for emails to be write-able on creation.
- Fixed selected attribute in view configuration for Taxonomy.
- Fixed an issue affecting per region taxonomies where value would save on submit/update but wouldn't persist visually.
- Fixed an issue when high resolution videos produced bounding boxes with corrupted coordinates due to the zoom lag.
- Fixed selecting regions in outline and text when browsing history.
- Export failed with review counters in filters.
- Fixed an issue when the meta is not saved to the region.
- Removed interpolation from the currently selected frame hides the label and the selection box.
- Fixed the issue when the meta is not saved to the region.
- Enabled alias for taxonomy choice.
- Fixed URL serialization of numeric virtual tab filters..
- Fixed loading indicator resolving too early and showing no more annotations in label stream.
- Reverted current `isReady` fix.
- Denied removing users by API.
- Added simple equality metric for video.
- Fixed issue with `<Repeater>` scrolling and Taxonomy annotations display.
- Prevented the tabs from being removed and clearing out the related popup.
- Fixed CONLL export tokenization issue with splitting into individual tokens.
- Implemented Proxy storage links through nginx for auth check.
- Fixed review stats recalculation after metric change.
- The Bbox coordinates were preserved for both ‘Object detection' template and 'Repeater on images with taxonomy.
- Fixed project card to show correct counter for finished tasks.
- Removed the blocking modal when the server was unresponsive.
- Added per annotation choice distribution calculation.
- Fixed for projects, displayed on user's **Organization** page, include other organizations.
- Annotated audio regions spanned all channels.
- Previously created user through common signup failed with the SAML SSO login process.
- Fixed an issue with filtering over choices.
- Added agreement calculation for OCR template with `Brushlabels`, `RectangleLabels` and `Polygonlabels`.
- Fixed an agreement calculation for OCR with empty text values.
- Added images for empty annotations in export files for `You only look once (YOLO)` and `Visual Object Classes (VOC)`.
- SAML workspaces were reset on user login when `MANUAL_WORKSPACE_MANAGEMENT` was set to false.
- Cancelled skipped annotation retained previous history.
- Fixed review stream for assigned tasks.
- Fixed large timeseries datasets displayed incorrect `y` values.
- Fixed duplicating process to copy Google source/target storage.
- Fixed source storage duplicating tasks when clicking the **Sync** button multiple times.
- Vertical scrolling in **Review Stream** worked the same as in **Quick View** and **Label Stream**.
- Unfinished polygons were saved automatically and the history undo/redo hotkeys worked correctly.
- Stacktrace was no longer visible in the server error API responses.
- Resolved an issue affecting canceled skips for annotations where an incorrect button will display after.
- Fixed naive metric for the regions without labels and compound configs (like `<Rectangle>` + `<Labels>`).
- Fixed OCR template agreement calculation for missing labels.
- Removed project number from `file_name` of image in COCO Export.
- Fixed the issue when switching between history items doesn't display selected choices/taxonomy.
- Copied all project settings from template to new project.
- Fixed an issue with broken `<Repeater>` pagination mode when "Select regions after creating" was opted.
- Logins expired after 15 minutes of inactivity or 8 days after login, based on first come first served occurrence.
- Fixed validation error for history.
- Resolved an issue affecting the Eraser tool which made it unusable since it cleared selected regions on tool selection.
- Manual updates to region coordinates in the region editor were applied correctly and did not block moving the region.
- Fixed the empty `toName` in `Control` tag.
- Fixed an issue with history steps in the scenario of auto-detection.
- Navigation using task links was broken.
- Fixed an issue with high memory consumption, memory leakage, and increased loading times.
- Added edit/delete comment functionality.
- Addressed the issue when the dynamic `Choices` was saved with the incorrect/empty value.
- Updated swagger docs for `AllStorage` APIs.
- Added example output for `HyperTextLabels` in the Label Studio documentation suite.




</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2210md"></a>

## Label Studio Enterprise 2.2.10

<div class="onprem-highlight">Bug fixes</div>

This section highlights the bug fixes in Label Studio Enterprise 2.2.10.

### Bug fixes
Label Studio 2.2.10 includes the following bug fixes:

#### Backend
- Per label score for `Choices` was calculated when `no Choice` was selected.
- Fixed an error for actions with ordering by **joined** field.
- Fixed auto-generated docs for `api/tasks`.

#### Frontend
- Fixed an issue when the Safari browser stopped working.
- Fixed scrollable area in **Review** mode.




</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="229md"></a>

## Label Studio Enterprise 2.2.9

<div class="onprem-highlight">Dynamic Labels template, Comments column in the Data Manager, decommissioning MinIO</div>

This section highlights the breaking changes, new features and enhancements, and bug fixes in Label Studio Enterprise 2.2.9. 

### Breaking changes
Label Studio Enterprise 2.2.9 includes the following breaking change:

- This release decommissions MinIO as a service.

### New features and enhancements 
Label Studio Enterprise 2.2.9 introduces the following new features and enhancements.

#### Backend
- This release provides proxy support for content-range HTTP responses.
- Add API for project duplication.

#### Frontend
- This release introduces the ability to select model version on model cards from the machine learning page >> **Settings**.
- Now, you can show the comments column in the Data Manager to reviewers.
 
#### Templates
- This release introduces [Dynamic Labels templates](https://labelstud.io/templates/gallery_dynamic_labels.html#main). You can now show labels dynamically as a task input, either as a prediction from the model or from a database lookup. With a broader set of options, dynamic labeling saves time and increases the consistency of labeling the objects. 

### Bug fixes
Label Studio 2.2.9 includes the following bug fixes:

#### Backend
- Optimized dashboard-members API performance for reviews.
- Enabled Query optimization for Uniform Sampling in the Labeling Stream.
- Fixed runtime error when duration was not extracted on `ASR_MANIFEST` export.
- Fixed permissions for a manager role.
- Fixed `annotation_id` was provided as float value in CSV export.
- Replaced `inner_id` index with multicolumn.
- Recalculate stats when control weights were updated.
- Fixed empty agreement for taxonomy with extra labels.
- Fixed `is_labeled` calculation after task import.

#### Frontend 

- Fixed the regions that disappeared from UI in **Annotation History**. 
- Improved the **Annotation History** name/timestamp spacing.
- Fixed audio crashes in **View All** mode.
- Pan does not finish the polygon.
- Fixed nested choices for the indeterminate state.
- Fixed an issue to get text after granularity was applied in **Annotation Result**.
- Zoomed image region out of bounds.
- Viewed all audio responsive.
- Fixed an issue where all parts of audio in the **View All** mode were equally responsive to browser size changes.
- Resynchronized annotations that failed to synchronize in **Target Storage**.
- Supported lengthy unbroken taxonomy line breaks.
- Retained the size for key points. 
- Display the correct number of member icons on project cards.
- Fixed rendering issue on video regions.
- Fixed the loading issue for `Paragraph` data on **QuickView**.
- Allowed edit action on Time Series results imported as read-only.
- Fixed Annotation History when exiting **View All**. 
- Added X-axis zoom threshold.
- Added guard with an error message for non-incremental, non-sequential datasets in Time Series.
- Disabled the delete **all region** button when an annotation is read-only.
- Fixed blind Server-side Request Forgery (SSRF) on add model and import.
- Deselected the ImageView bounding box before creating another. 
- Fixed data in Search Engine Results Page (SERP) ranking in-app template. 
- Unfinished polygon zoom fix. 
- Fixed flickering issue when regions were created with the Bounding box.
- Video regions were edited when Annotation History was selected.
- Added background as a new parameter to text shortcuts.
- Fixed the form layout and allowed the model version selector when the ML backend was edited.
- Text and Header tags work with integers now.
- Fixed synchronization speed between video and audio.
- Fixed an issue with prop `whenChoiceValue`.




</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="228md"></a>

## Label Studio Enterprise 2.2.8

<div class="onprem-highlight">Comment visibility, SCIM enhancements, Redis SSL support, notification center, drafts in Annotation History, new history types</div>

This section highlights the breaking changes, new features and enhancements, and bug fixes in Label Studio Enterprise 2.2.8. 

### New features and enhancements
Label Studio Enterprise 2.2.8 introduces the following new features and enhancements.

- This release displays comments in **DM** to reviewers.
- Support for [Redis Secure Sockets Layer (SSL)](#Secure-access-to-Redis-storage).
- Add tags and prefixes to [AWS metric parameters](#How-to-write-your-custom-agreement-metric).
- Change review API to take into account feedback loop.
- Notification Center
- Add drafts in Annotation History.
- Introduce new history types. 
- Support for System for Cross-domain Identity Management (SCIM 2.0) user and group provisioning.
- Add the ability to pass a comment to APIs on skip.

### Bugfixes
Label Studio 2.2.8 includes the following bug fixes:

- Per label score for Choices was calculated when no Choice was selected (hotfix-7).
- Fixed Rotating bounding box bugs (hotfix-4)
- Fixed permissions for manager role (hotfix-3)
- Fixed export to file using `SerializableGenerator`.
- Fixed accepted state in review.
- Made Annotation History with linear Reject (Reject = Update + Reject).
- Fixed Annotation History icons.
- Annotation history fixes.
- Fixed an issue where the Annotation History was not loading because of string ID.
- Fixed validation in Labeling Interface preview with Dynamic Labels.
- Fixed history 404 on unskip in label stream.
- Fixed **Annotation History** reset for predictions.
- Fixed job cancellation for `_update_tasks_states`.
- Fixed an issue to return `404` for `api/project/id/tasks` when the page was out of scope
- Interactive preannotations for **Paragraphs**.
- Improved the speed to 180 secs for assigned tasks.
- Disabled **Poly** and **Keypoints** for **Annotation History**.
- Fixed tools multiplication issue.
- Prevented the scroll-out **TopBar** option.
- Fixed skip queue.
- Allowed **Canvas** to fill all the space.
- Truncated long words in comments.
- Added scroll to view when focus changes to `stickyList` in table component.
- Used `contain` instead of `icontain` for **Annotation Result** field in the **Data manager** filters.
- Fixed `is_labeled` for tasks with no assignments.
- Added default settings.
- Implemented `Go back to previously reviewed task` functionality for reviewing stream.
- Refactored and optimized Redis Queues.
- Fixed runtime error during import with no `total_annotations` and other.
- Reviewed Next Task API performance optimizations.
- Fixed the reset rejected status after the annotation update.
- Fixed skip **Annotation History** for the previous task in label stream.
- Fixed Reviewed filter.
- Fixed counters for skipped annotations.
- Fixed an issue where tasks were flagged as REVIEWED by default.
- Fixed an issue for skipped tasks to get the `Completed` status.
- Fixed error when a user tried to delete all tasks.
- Fixed filter by empty reviewers.
- Fixed incorrect review card counters in the feedback loop for skipped annotations.
- Moved from signal to model delete method.
- Added new skip behavior for annotations that are requeued back to annotator.
- Fixed **Annotation History** drafts.
- Fixed regions for text span when it was out of bounding in the regions list and created horizontal scroll.
- Fixed in **Manage Members** modal (on project **Members** tab, on workspace members, on **Members** settings) header with search overlaps by the main list.
- Fixed `Textarea` for **Custom Function** on the **Quality** settings page.
- Fixed `startOffset` for empty nodes.
- Fixed the runtime error for users who deleted an annotation from **Quick View**,  switched to another task, and returned back to the same task.
- Added command for all orgs and optimize `update_tasks_counters`.
- After annotations from predictions `is_labeled` should be recalculated.
- Fixed 404 on skip.





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="220md"></a>

## Label Studio Enterprise 2.2.0

<div class="onprem-highlight">SCIM 2.0 support, rotating bounding boxes, 'Last updated by' column in the Data Manager, ability to navigate to the previous task </div>

This section highlights the new features and enhancements in Label Studio Enterprise 2.2.0.

### New features and enhancements 
Label Studio Enterprise 2.2.0 introduces the following new features and enhancements.

- Label Studio Enterprise 2.2.0 introduces the System for Cross-domain Identity Management (SCIM) version 2.0 standard. System for Cross-domain Identity Management (SCIM) is a popular protocol to manage access for services and applications across an organization. Use the [SCIM guide](scim_setup.html) to set up SCIM integration to manage access to Label Studio Enterprise in your organization.


   <i>Check the following video tutorial about SCIM and Okta setup.</i>
   <iframe width="560" height="315" src="https://www.youtube.com/embed/MA3de3gu18A" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

- Starting with this release, as an annotator you can create a rotated bounding box with the "three point click" or "two point click" feature to annotate images.  

    - First point click - Starting point of the location to draw the bounding box.
    - Second point click - Define the rotation and width of the bounding box.
    - Third point click - Draw the height of the bounding box.

    <br>
    <div style="margin:auto; text-align:center;"><img src="/images/two-point-click.png" style="opacity: 0.8"/></div>
    <i>Figure 1: Two point click rectangle.</i>

    
    <br>
    <div style="margin:auto; text-align:center;"><img src="/images/three-point-click.png" style="opacity: 0.8"/></div>
    <i>Figure 2: Three point click rectangle.</i>

    After you create the bounding box, you can do the following: 
    - Adjust it by moving the anchors or edges to the desired location on the canvas.
    - Determine that the orientation of the bounding box is effected.
    - See the orientation of the bounding box and determine the direction during the creation process.

- This release includes the `Last updated by` column in **Data Manager** with information of `updated_at` - `updated_by`, annotator/reviewer (the person who made the last modifications for any of the annotations in this task) at `updated_at` time.
    
    
    <br>
    <div style="margin:auto; text-align:center;"><img src="/images/last-updated-by-column.png" style="opacity: 0.8"/></div>
    <i>Figure 3: "Last updated by" column in Data Manager.</i>

- This release introduces the go-back functionality (`<` icon) that allows you to navigate back to the previous task through the review stream.

    <br>
    <div style="margin:auto; text-align:center;"><img src="/images/go-back-reviewstream.png" style="opacity: 0.8"/></div>
    <i>Figure 4: Go back to the previous task. </i>

- Starting with this release, you can create a **Lead Time** column in **Data Manager** with averaged lead time per task.

    <br>
    <div style="margin:auto; text-align:center;"><img src="/images/lead-time.png" style="opacity: 0.8"/></div>
    <i>Figure 5: Lead Time column in Data Manager. </i>
</div>