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
<a name="2331md"></a>

## Label Studio Enterprise 2.33.1

<div class="onprem-highlight">Bug fix for performance improvements</div>

*Mar 09, 2026*

Helm Chart version: [2.0.0](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

### Bug fixes

- Fixed an issue with unnecessary SDK endpoint caching in on-prem environments, leading to performance improvements. 






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2330md"></a>

## Label Studio Enterprise 2.33.0

<div class="onprem-highlight">Programmable interfaces with React, vectors, Databricks Service Principals, and stronger quality settings</div>

*Feb 26, 2026*

Helm Chart version: [2.0.0](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

### New features

#### Programmable interfaces with React

We're introducing a new tag: [**`<ReactCode>`**](/tags/reactcode).

ReactCode represents new evaluation and annotation engine for building fully programmable interfaces that better fit complex, real-world labeling and evaluation use cases.

With this tag, you can:

- Build flexible interfaces for complex, multimodal data
- Embed labeling and evaluation directly into your own applications, so human feedback happens where your experts already work
- Maintain compatibility with the quality, governance, and workflow controls you use in Label Studio Enterprise

![Screenshot](/images/releases/2-33-react-audio.png)

![Screenshot](/images/releases/2-33-react-pdf.png)

![Screenshot](/images/releases/2-33-react-claims.png)

For more information, see the following resources:

- [**ReactCode tag**](/tags/reactcode)
- [**ReactCode templates**](/templates/gallery_react)
- [**Web page - The new annotation & evaluation engine**](https://humansignal.com/programmable-ui/)
- [**Blog post - Building the New Human Evaluation Layer for AI and Agentic systems**](https://humansignal.com/blog/new-evaluation-engine/)

#### Annotate images with vector lines

There are two new tags for image annotation: [**Vector**](/tags/vector) and [**VectorLabels**](/tags/vectorlabels). 

You can use these tags for point-based vector annotation (polylines, polygons, skeletons).   

![Screenshot](/images/tags/vector.png)

### Feature updates

#### Service Principal authentication for Databricks

When setting up cloud storage for Databricks, you can now select whether you want to use a personal access token, Databricks Service Principal, or Azure AD Databricks Service Principal.

For more information, see [Set up Databricks UC volume storage](storage_databricks).

![Screenshot](/images/releases/2-33-db.avif)

#### Updated project Members page

The **Project > Settings > Members** page has been fully redesigned.

It includes the following changes:

- Now, when you open the page, you will see a table with all project members, their role, when they were last active, and when they were added to your organization.
- You can now hide inherited project members.Inherited members are members who have access to the project because they inherited it by being an Administrator or Owner, or by being added as a member to the project's parent workspace.
- To add members, you can now click **Add Members** to open a modal where you can filter organization members by name, email, and last active.Depending on your organization's permissions, you can also invite new organizations members directly to the project.

##### Before

**Members** page:

![Screenshot](/images/releases/2-33-members-before.avif)

##### After

**Members** page:

![Screenshot](/images/releases/2-33-members0.avif)

**Add Members** modal:

![Screenshot](/images/releases/2-33-members1.avif)

#### Updated members table on Organization page

The members table on the Organization page has been redesigned and improved to include:

- A **Date Added** column
- Pagination and the ability to select how many members appear on each page
- When viewing a member's details, you can now click to copy their email address

Members table:

![Screenshot](/images/releases/2-33-members-table.avif)

Member details:

![Screenshot](/images/releases/2-33-members-details.avif)


#### Interactive view for task source

When clicking **Show task source <>** from the Data Manager, you will see a new **Interactive** view.

From here you can filter, search, and expand/collapse sections in the task source. You can also selectively copy sections of the JSON and toggle whether to show the resolved URIs. 

![Screenshot](/images/releases/2-33-source.avif)


#### Set strict overlap for annotators

There is a new [**Enforce strict overlap limit**](https://docs.humansignal.com/guide/project_settings_lse#overlap) setting under **Quality > Overlap of Annotations**.

Previously, it was possible to have more annotations than the number you set for **Annotations per task**.

This would most frequently happen in situations where you set a low task reservation time, meaning that task locks expired before annotators submitted their tasks -- allowing other annotators to access and then submit the task, and potentially resulting in an excess of annotations.

When this new setting is enabled, if too many annotators are try to submit a task, they will see an error message. Their draft will be saved, but they will be unable to submit their annotation.

Note that strict enforcement only applies towards annotations created by users in the Annotator role.

![Screenshot](/images/releases/2-33-strict1.png)

![Screenshot](/images/releases/2-33-strict2.avif)



#### Configure continuous annotator evaluation

Previously, when configuring [**annotator evaluation**](https://docs.humansignal.com/guide/project_settings_lse#annotator-eval) against ground truth tasks, you could configure exactly how many ground truth tasks each annotator should see as they begin annotating. The remaining ground truth tasks would be shown to each annotator depending on where they are and the task ordering method.

Now, you can set a specific number of ground truth tasks to be included in continuous evaluation.

You can use this as a way to ensure that not all annotators see the same ground truths, as some will see certain tasks during continuous evaluation and others will not.

**Before:**

![Screenshot](/images/releases/2-33-continuous1.avif)

**After:**

![Screenshot](/images/releases/2-33-continuous2.avif)



#### Restrict Prompts evaluation for tasks without predictions

There is a new option to only run a Prompt against tasks that do not already have predictions.

This is useful for when you have failed tasks or want to target newly added tasks.

![Screenshot](/images/releases/2-33-prompts.avif)


#### Improvements to the template builder

- **Resize panel widths in the template builder**
    
    You can now click and drag to adjust panel widths when configuring your labeling interface.

    <video style="max-width: 600px;" class="gif-border" autoplay loop muted>
      <source src="/images/releases/2-33-code.mp4">
    </video>
    
- **Press Ctrl + F/Command + F to search the Code tab**

    When working in the template builder, you can now use Ctrl + F to search the your labeling configuration XML.

    ![Screenshot](/images/releases/2-33-ctrf.png)


#### Improvements to analytics

There have been several improvements to analytics charts: 

- Improved colors and animations.

- The submitted annotation metrics now include annotations created from predictions. 

- The value displays have been standardized so that a long dash (--) appears when there is no data, and a zero appears with there is data present but the value is `0`. 

- When you want to select multiple users in the [Member Performance dashboard](dashboard_annotator), there is a new **All Members** option in members drop-down.

    - If you are filtering the member list, **All Members** will select all users matching your search criteria (up to 50 users).
    - If you are not filtering the member list, **All Members** will select the first 50 users.

- When viewing the Member Performance dashboard, Managers will now only be able to see users who are members of projects or workspaces in which the Manager is also a member.

    Previously, Managers could see the full organization user list, but could only see user metrics for projects in which the Manager was also a member.


#### Added support for latest Anthropic models

Added support for the following models:

`claude-sonnet-4-5`

`claude-haiku-4-5`

`claude-opus-4-5`

#### Deprecated GPT models

The following models have been deprecated:

`gpt-4.5-preview`

`gpt-4.1`

`gpt-4.1-mini`

`gpt-4.1-nano`

`gpt-4`

`gpt-4-turbo`

`gpt-4o`

`gpt-4o-mini`

`o3-mini`

`o1`

#### Additional feature updates and UI improvements

**Data Manager and labeling**

* Use Shift to select multiple Data Manager rows.

    You can now select a Data Manager row, and then while holding shift, select another Data Manager row to select all rows between your selections.

* It is now clearer how to access the task summary view. The icon has been replaced with a **Compare All** button.

    For additional clarity, the **Compare** tab has now been renamed **Side-by-Side**.

    ![Screenshot](/images/releases/2-33-compare.avif)

* When you hover over an annotation tab in Quick View, you will now see metadata for the annotation. 

    <img src="/images/releases/2-33-tooltip.png" style="max-width: 500px" alt="Screenshot"> 
* Updated appearance and guidance text for the text area component. 




**Project settings**

* You can now set [annotation overlap](https://docs.humansignal.com/guide/project_settings_lse#overlap) up to 500 annotations. Previously this was restricted to 20 when setting it through the UI.

* The [annotator evaluation](https://docs.humansignal.com/guide/project_settings_lse#annotator-eval) settings are now only available when the project is using automatic annotator assignment rather than manual assignment. 

**Other updates**

- How time is displayed across the app has been standardized to use the following format:

    `[n]h [n]m [n]s`

    For example: **10h 5m 22s**

- The **Recent Projects** list on the Home page will now include the most recently visited projects at the top of the list instead of pinned projects.

- The **Early Adopter** toggle has been removed from **Organization > Usage & License**. For on-prem deployments, you can selectively enable feature flags instead. 

- Added clarity to the messages that annotators see when they are paused. 

- If you have a published project that is in a shared workspace and you move it to your Personal Sandbox workspace, the project will automatically revert to an unpublished state.

    Note that published projects in Personal Sandboxes were never visible to other users. This change is simply to support upcoming enhancements to project work states.



### Security

- Increased the log level for SSO/SAML authentication events. Previously, certain events would only appear if the log level was set to DEBUG. 

- Fixed an XSS issue with custom hotkeys. 

### Bug fixes

- Fixed an issue where, when using the SDK, PATs would fail if there was a trailing slash in the base URL.

- Fixed several issues related to support report content and appearance.

- Fixed an issue with how the Enterprise tag appeared on templates when creating a project.

- Fixed an issue where the workspace **Members** action was not always clickable.

- Fixed an issue with agreement calculation for Rating tags.

- Fixed an issue where Managers could move projects to workspaces even if they weren’t a workspace member.

- Fixed a layout issue with the overflow menu on the project Dashboard page.

- Fixed an issue that prevents loading Label Studio in an airgapped environment.

- Fixed a small UI issue in Firefox related to horizontal scrolling.

- Fixed an issue that prevented the project dashboard CSV and JSON exports from working.

- Fixed an issue with the organization members page where clicking on a member would reset the table pagination.

- Fixed an issue causing the annotation time in the Member Performance dashboard to not evaluate correctly.

- Fixed an issue with row margins in the Data Manager.

- Fixed an issue with the inter-annotator agreement endpoint when requesting stats for projects with a large number of annotators/annotations.

- Fixed an issue where the the review status badge was missing from avatars in annotation tabs.

- Fixed an issue where API token creation was not generating activity log entries.

- Fixed an issue with cloud storage job failures caused by synchronization issues related to large JSON files.

- Fixed several issues cause out-of-memory events.

- Fixed an issue where extra space appeared at the end of Data Manager table rows.

- Fixed an issue where virtual/temporary tabs in the Data Manager appeared solid when viewed in Dark Mode.

- Fixed an issue that occurred when trying to upload predictions for VectorLabels and OcrLabels regions.

- Fixed an issue where covert_to_yolo in the SDK would use sequence number instead of task ID.

- Fixed an issue where emailed invite links for Organizations were expiring within 24 hours.

- Fixed an issue that prevented using the context menu to archive and unarchive workspaces.

- Fixed several issues with the SCIM page that would cause it not to save properly.

- Fixed several issues with SAML that would cause group mapping to be unpredictable in how it assigned group roles.

- Fixed an issue with the filter criteria drop-down being too small to be useable.

- Fixed an issue where sometimes the user in the Owner role would be demoted if logging in through SSO.

- Fixed an issue with an error being thrown on the project members page.

- Fixed an issue where, when switching from an Annotator to Reviewer role within a project, the **Review** button was missing proper padding.

- Fixed an issue with a validation error when importing HypertextLabels predictions.

- Fixed an issue where incorrect tasks counts were shown on the Home page.

- Fixed an issue with indices seen when using Prompts for NER tasks.

- Fixed an issue where multi-channel time series plots introduced left-margin offset causing x‑axis misalignment with standard channel rows

- Fixed an issue with the Apply button on the dashboard pages.

- Fixed an issue with the autocomplete pop-up width when editing code under the **Code** tab of the labeling configuration.

- Fixed an issue where the members drop-down on the Member Performance dashboard contained users who did not have a label.

- Fixed an issue on the Playground where images were not loading for certain tag types.

- Fixed an issue where dormant users who had not been annotating still reflected annotation time in the Member Performance dashboard.

- Fixed an issue where the **Agreement Selected** modal reset button was not functioning

- Fixed an issue with the API docs where pages for certain project endpoints could not be opened.

- Fixed a performance issue when calculating annotation and review time.

- Fixed an issue using copy to clipboard buttons on SAML settings page.

- Fixed an issue with validation on the SAML/SCIM pages. 
  
- Fixed an issue with project links in the Member Performance dashboard.

- Fixed an issue where Ranker tag styling was broken.

- Fixed an issue where a users could not create a new workspace mapping in the SCIM/SAML settings.

- Fixed a small visual issue when loading the labeling interface preview.

- Fixed an issue with the projects list pagination alignment and layout.

- Fixed an issue where the previous selected member search filter didn't change after making a new selection in the Member Performance dashboard.

- Fixed an issue where paused users were also seeing an error message about undefined properties.

- Fixed an issue where users could still be provisioned via SAML even after the user limit had been reached.

- Fixed an issue with inconsistent expand/collapse icons on dashboard pages.







</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2321md"></a>

## Label Studio Enterprise 2.32.1

<div class="onprem-highlight">Bug fixes</div>

*Jan 22, 2026*

Helm Chart version: [2.0.0](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

### Bug fixes

- Fixed an issue where the Owner role could not be updated in organizations that use Stripe billing.
- Fixed an issue where API token creation was not generating activity log entries. 







</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2320md"></a>

## Label Studio Enterprise 2.32.0

<div class="onprem-highlight">Support reports, granular permission options, new command palette</div>

*Jan 14, 2026*

Helm Chart version: [1.11.7](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

### New features

#### Support reports

There is a new option under **Organization > Settings** to create Support Reports. 

A Support Report is a downloadable file with diagnostic and usage statistics generated from your Label Studio Enterprise deployment. 

These reports can help our support engineer diagnose issues, but are also transparent - meaning you can inspect their contents before sharing. 

For more information, see [Support reports](support_reports). 

![Screenshot](/images/releases/2-32-support-reports.png)

#### Refine permissions

There is a new page available from **Organization > Settings > Permissions** that allows users in the Owner role to refine permissions across the organization.

This page is only visible to users in the Owner role.

For more information, see [Customize organization permissions](admin_permissions).

![Screenshot](/images/releases/2-32-permissions.png)

#### Command palette for enhanced searching

The command palette is an enhanced search tool that you can use to navigate to resources both inside and outside the app, find workspaces and projects, and (if used within a project) navigate to project settings.

For more information, see [Command palette](command_palette).

<img src="/images/releases/2-32-command-palette.png" style="max-width: 500px" alt="Screenshot">

### Feature updates

#### Annotator evaluation enhancements

The [Annotator Evaluation](https://docs.humansignal.com/guide/project_settings_lse#annotator-eval) feature been improved to include a more robust ongoing evaluation functionality and improved clarity within the UI.

Enhancements include:

- An improved UI to make it clearer what will happen based on your selections.
- Previously if you were using "ongoing" evaluation mode, ground truth tasks were restricted by whatever [overlap](https://docs.humansignal.com/guide/project_settings_lse#overlap) you configured for your project. This meant that typically only the first annotators to reach the ground truth tasks were evaluated.Now, if annotator evaluation is enabled, all annotators will be evaluated against ground truth tasks regardless of whether the overlap threshold has been reached. This will ensure that even if the project has a large number of annotators and a comparatively small annotation-per-task requirement, all annotators will still be evaluated.
- You can now set up your project so that annotator evaluation happens both at the beginning of the project as well as on an ongoing basis. Previously, you could only choose one or the other.

**Before:**

<img src="/images/releases/2-32-ann-eval-before.png" style="max-width: 500px" alt="Screenshot">

**After:**

<img src="/images/releases/2-32-ann-eval-after.png" style="max-width: 500px" alt="Screenshot">

!!! info Tip
    You can disallow skipping in all project tasks. But if you want to allow skipping while ensuring that annotators cannot skip ground truth tasks, you can use the new unskippable task feature described below. 

#### Task summary improvements

We have made a number of improvements to task summaries.

**Before:**

<img src="/images/releases/2-32-task-summary-before.png" style="max-width: 500px" alt="Screenshot">

**After:**

<img src="/images/releases/2-32-task-summary-after.png" style="max-width: 500px" alt="Screenshot">

Improvements include:

- **Label Distribution** 
A new **Distribution** row provides aggregate information. Depending on the tag type, this could be an average, a count, or other distribution.
- **Updated styling**
Multiple UI elements have been updated and improved, including banded rows and sticky columns. You can also now see full usernames.
- **Autoselect the comparison view**
If you are looking at the comparison view and move to the next task, the comparison view will be automatically selected.

#### Improved annotation tabs

Annotation tabs have the following improvements:

- To improve readability, removed the annotation ID from the tab and truncated long model or prompts project names.
- Added three new options to the overflow menu for the annotation tab:
    - **Copy Annotation ID** - To copy the annotation ID that previously appeared in the tab
    - **Open Performance Dashboard** - Open the Member Performance Dashboard with the user and project pre-selected.
    - **Show Other Annotations** Open the task summary view.

**Before:**

<img src="/images/releases/2-32-tabs-before.png" style="max-width: 500px" alt="Screenshot">

**After:**

<img src="/images/releases/2-32-tabs-after.png" style="max-width: 500px" alt="Screenshot">


#### Unskippable tasks

While you can hide the **Skip** action in the [project settings](https://docs.humansignal.com/guide/project_settings_lse#Annotation), this enhancement allows you to configure individual tasks so that any user in the Annotator or Reviewer role should not be able to skip them.

To make a task unskippable, you must specify `"allow_skip": false` as part of the JSON task definition that you import to your project.

For example, the following JSON snippet would result in one skippable task and one unskippable task:

```json
[
  {
    "data": {
      "text": "Demo text 1"
    },
    "allow_skip": false
  },
  {
    "data": {
      "text": "Demo text 2"
    }
  }
]
```
For more information, see [Skipping tasks](skip).

#### Apply overlap only to distinct users

When configuring [**Annotations per task**](https://docs.humansignal.com/guide/project_settings_lse#overlap) for a project, only annotations from distinct users will count towards task overlap.

Previously, if a project had **Annotations per task** set to 2, and User A created and then submitted two annotations on a single task (which can be done in Quick View), then the task would be considered completed.

Now, the task would not be completed until a different user submitted an annotation.

#### Improved Local Storage setup process

The Local Storage setup process has a number of improvements. 

Changes include:

- When entering the absolute local path in the storage modal, trailing slashes will be automatically removed to prevent an error.
- Normalized slashes when saving the absolute local path to prevent confusion between Unix and Windows environments.
- If you create folders named "my-data" or "label-studio-data" and run the label-studio command in the parent directory, the `LOCAL_FILES_DOCUMENT_ROOT` and `LOCAL_FILES_SERVING_ENABLED` variables will be automatically set to point to those folders. 
- Improved error messages when the absolute local path does not include a subdirectory but matched the local files document root.
- When the local files document root is set, the absolute local path is automatically preloaded with the appropriate path.

#### Support for GPT-5.1 and GPT-5.2

When you add OpenAI models to Prompts or to the organization model provider list, GPT-5.1 and GPT-5.2 will now be included.

#### Additional functional and usability enhancements

- When configuring SAML, you can now click on a selection of common IdPs to pre-fill values with presets.

- The **Recent Projects** list on the Home page will now include the most recently visited projects at the top of the list instead of pinned projects.

- Removed the **Publish** button from the project Members page. It is now only on the Dashboard page.

- When [using the API](https://api.labelstud.io/api-reference/api-reference/projects/members/bulk/post#request.query) to bulk assign and unassign users, you can now filter by last activity and role.

- To better utilize space, the annotation ID and the navigation controls for the labeling stream have been moved to below the labeling interface.

    <img src="/images/releases/2-32-task-nav.png" style="max-width: 500px" alt="Screenshot">

#### Performance improvements

This release includes multiple performance improvements and optimizations.

### Security

Improved permission checks when retrieving the workspaces list.

### Bug fixes

- Fixed an issue where PDFs were not filling the full height of the canvas.

- Fixed a number of issues causing out-of-memory errors.

- Fixed a layout issue with the overflow menu on the project Dashboard page.

- Fixed a number of issues with the Member Performance Dashboard.

- Fixed an issue that would cause API validation to fail when setting a 99% low agreement threshold.

- Fixed an issue where the AI-assisted project setup would return markdown, causing an error.

- Fixed an issue with agreement scores for Rating.

- Fixed an issue with Managers being able move projects into workspaces where they were not members.

- Fixed an issue with prediction validation for the Ranker tag.

- Fixed an issue with syncing from Databricks.

- Fixed an issue where users could not display two PDFs in the same labeling interface.

- Fixed an issue where the scores reflected under **Agreement (Selected)**  were sometimes lower than expected.

- Fixed an issue where the **Agreement (Selected)** dropdown would not open.

- Fixed an issue where relations between VideoRectangles regions were not visible.

- Fixed an issue that caused the Data Manager to throw a Runtime Error when sorting by Review Time.

- Fixed an issue when PDF regions could not be drawn when moving the mouse in certain directions.

- Fixed an issue where users were not shown a clear error message when attempting to access a page in which you do not have permission to view.

- Fixed an issue with prompts not allowing negative Number tag results.

- Fixed an issue that prevented scrolling the filter column drop-down after clearing a previous search.

- Fixed an issue where region labels were not appearing on PDFs even if the **Show region labels** setting was enabled.

- Fixed an issue that could cause the sidebar menu to be blank.

- Fixed a minor visual issue when auto-labeling tasks in Safari.

- Fixed an issue where clicking on an annotator's name in the task summary did not lead to the associated annotation.

- Fixed an issue where the `required` parameter was not always working in Chat labeling interfaces.

- Fixed an issue where conversion jobs were failing for YOLO exports.

- Fixed an issue with redirection after deleting a workspace.

- Fixed an issue where accepted reviews were not reflected in the Members dashboard.

- Fixed an issue where **Submit** and **Skip** buttons were hidden if opening the labeling stream when previously viewing the Task Summary.

- Fixed an issue where PDFs could sometimes appear flipped.

- Fixed an issue with Databricks storage when upgrading releases.

- Fixed a styling issue when navigating back from the Activity Log page into the Members dashboard.

- Fixed an issue where embedded YouTube videos were not working in `<HyperText>` tags.

- Fix an issue with `<DateTime>` tags when using consensus-based agreement.

- Fixed an issue where import jobs through the API could fail silently.

- Fixed an issue where the **Copy region link** action from the overflow menu for a region disappeared on hover.





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2310md"></a>

## Label Studio Enterprise 2.31.0

<div class="onprem-highlight">Inline OCR labeling for PDFs, Markdown tag, better visibility into agreement and member performance</div>

*Dec 03, 2025*

Helm Chart version: [1.11.6](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

### New features

#### Inline OCR labeling in PDF files

You can now perform page-level annotation on PDF files by highlighting OCR regions.

This new functionality also supports displaying PDFs natively within the labeling interface, allowing you to zoom and rotate pages as needed.

For more information, see the [PDF tag documentation](/tags/pdf) and [Blog - Inline PDF Labeling in Label Studio Enterprise for OCR](https://humansignal.com/blog/inline-pdf-labeling-in-label-studio-enterprise-for-ocr/).

<video style="max-width: 600px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/2-31-PDF.mp4">
</video>


#### New Markdown tag

There is a [new Markdown tag,](/tags/markdown) which you can use to add content to your labeling interface.

For example, adding the following to your labeling interface:

```xml
<View>
<Markdown>
## Heading 2
    
### Heading 3
    
- bullet point one
- bullet point two
    
**Bold text** and *italic text*
    
`inline code`
    
\```
code block
\```
    
[Link](https://humansignal.com/changelog/)

![image](https://upload.wikimedia.org/wikipedia/commons/2/27/Opossum_2.jpg)
</Markdown>
</View>
```

Produces this:

<img src="/images/releases/2-31-markdown.png" style="max-width: 500px" alt="Screenshot">

#### New Agreement (Selected) column

There is a new **Agreement (Selected)** column that allows you to view agreement data between selected annotators, models, and ground truths.

This is different than the **Agreement** column, which displays the average agreement score between all annotators.

Also note that now when you click on a comparison between annotators in the [**agreement matrix**](https://docs.humansignal.com/guide/dashboard_members#Annotator-Agreement-Matrix), you will be taken to the Data Manager with the **Agreement (Selected**) column pre-filtered for those annotators and/or models.

For more information, see [**Agreement and Agreement (Selected) columns**](https://docs.humansignal.com/guide/manage_data#Agreement-and-Agreement-Selected-columns).

<img src="/images/releases/2-31-agreement-selected.png" style="max-width: 500px" alt="Screenshot">


#### New Analytics navigation and improved performance dashboard

The Member Performance dashboard has been moved to a location under Analytics in the navigation menu. This page now also features an improved UI and more robust information about annotating and reviewing activities, including:

- Consolidated and streamlined data
- Additional per-user metrics about reviewing and annotating activity
- Clearer UI guidance through tooltips
- Easier access through a new Analytics option in the navigation menu

For more information, see [Member Performance Dashboard](dashboard_annotator).

![Screenshot](/images/releases/2-31-analytics2.png)

![Screenshot](/images/releases/2-31-analytics1.png)


### Feature updates

#### Markdown and HTML in Chat

The Chat tag now supports markdown and HTML in messages. 

This opens up multi-modal use cases within chat:

![Screenshot](/images/releases/flight_app_builder.gif)

For example, add images and code blocks through markdown:

![Screenshot](/images/releases/2-31-chat1.png)

![Screenshot](/images/releases/2-31-chat2.png)

![Screenshot](/images/releases/2-31-chat3.png)

![Screenshot](/images/releases/2-31-chat4.png)

Or even evaluate entire websites using an iframe:

![Screenshot](/images/releases/2-31-chat5.png)

![Screenshot](/images/releases/2-31-chat6.png)


#### Additional chat improvements

- Fixed an issue where Tool calls appeared as User calls in the chat UI.

- Chat messages that reference files stored in cloud storage (S3, Azure, GCS, Dropbox) are now automatically converted to accessible presigned URLs, allowing users to view or download files without permission errors.

- Chat templates are now available in the in-app chat gallery.

#### Improved project quality settings

The [**Quality section**](https://docs.humansignal.com/guide/project_settings_lse#Quality) of the project settings has been improved.

- Clearer text and setting names
- Settings that are not applicable are now hidden unless enabled

<img src="/images/releases/2-31-quality.png" style="max-width: 650px" alt="Screenshot">

#### Additional validation when performing destructive actions in projects

When deleting a project, resetting the project cache, or dropping all project tabs, users will now be asked to enter text in the confirmation window:

<img src="/images/releases/2-31-delete.png" style="max-width: 500px" alt="Screenshot">

#### Improved project onboarding checklist

The onboarding checklist for projects has been improved to make it clearer which steps still need to be taken before annotators can begin working on a project:

![Screenshot](/images/releases/2-31-checklist.png)

#### Agreement calculation change

When calculating agreement, control tags that are not populated in each annotation will now count as agreement.

Previously, agreement only considered control tags that were present in the annotation results. Going forward, all visible control tags in the labeling configuration are taken into consideration.

For example, the following result set would previously be considered 0% agreement between the two annotators, as only choices group 1 would be included in the agreement calculation.

Now it would be considered 50% agreement (choices group 1 has 0% agreement, and choices group 2 has 100% agreement).

**Annotator 1**

Choices group 1

A ✅

B ⬜️

Choices group 2

X ⬜️

Y ⬜️

**Annotator 2**

Choices group 1

A ⬜️

B ✅

Choices group 2

X ⬜️

Y ⬜️

!!! note

    This change only applies to new projects created after November 13th, 2025.

    Only visible tags are taken into consideration. For example, you may have tags that are conditional and hidden unless certain other tags are selected. These are not included in agreement calculations as long as they remain hidden.


#### Personal Access Token support for ML backends

Previously, if using a [machine learning model](ml) with a project, you had to set up your [ML backend](https://github.com/HumanSignal/label-studio-ml-backend) with a legacy API token.

You can now use personal access tokens as well.

#### Additional functional and usability enhancements

- There is a new option to select between the default column display and a more compact version.

- Updated UI on the Cloud Storages page when storage has not yet been set up.

- Added user session IDs to activity logs.

- Added a `none` option for the `decoder` param for Audio tags, which will allow you to skip audio decoding for use cases that require labeling on the timeline but the file size is far too large to decode at one time. 


#### Performance improvements

This release includes multiple performance improvements and optimizations. 

### Security

Improved permission checks when retrieving projects. 

### Bug fixes

- Fixed an issue with prediction validation for per-region labels.

- Fixed an issue with COCO export for brush tool annotations.

- Fixed an issue where importing a CSV would fail if semicolons were used as separators.

- Fixed an issue where the **Ready for Download** badge was missing for JSON exports.

- Fixed an issue where changing the task assignment mode in the project settings would sometimes revert to its previous state.

- Fixed an issue where onboarding mode would not work as expected if the **Desired agreement threshold** setting was enabled.

- Fixed an issue with multiple annotation tabs to make the active tab easier to identify.
- Fixed an issue where the user avatar would get hidden when scrolling horizontally across annotation tabs in a task.

- Fixed a small visual issue with the scrollbar.

- Fixed an issue where ground truth tasks were shown first even if the project was not in Onboarding evaluation mode.

- Fixed a layout issue on the Prompts page.

- Fixed an issue where Personal Access Tokens were disabled by default in new organizations.

- Fixed an issue where webp images would not render.

- Fixed an issue where the app page title was not updating in the browser tab.

- Fixed an issue where child filters would be lost when navigating away from the Data Manager.

- Fixed an issue where, when accessing the Member Performance Dashboard from the home page, it would filter for the wrong user.

- Fixed an issue where ordering by media start time was not working for video object tracking.

- Fixed an issue where dashboard summary charts would not display emojis.

- Fixed an issue where hotkeys were not working for bulk labeling operations.

- Fixed an issue with some projects not loading on the Home page.

- Fixed some minor visual issues with filters.

- Fixed an issue with selecting multiple users in the Members Performance dashboard.

- Fixed an issue with duplicated text area values when using the `value` parameter.

- Fixed an issue with ground truth agreement calculation.

- Fixed an issue with links from the Members dashboard leading to broken Data Manager views.

- Fixed a small visual issue with the bottom border of the Data Manager.

- Fixed issues with read-only states for Chat and PDF tags.

- Fixed issues with PDF rendering after resizing the page.

- Fixed an issue where the **Apply** action was not working on the Member Performance dashboard.

- Fixed an issue where searching for users from the Members dashboard and the Member Performance dashboard would clear previously selected users.

- Fixed an issue where the style of the Create Project header was broken.

- Fixed an issue where when video labeling with rectangles, resizing or rotating them were not updating the shapes in the correct keyframes.

- Fixed several small issues with font sizes.

- Fixed an issue with data range for MultiChannel when used with TimeSeries.

- Fixed an issue where the user filter on the Member Performance dashboard was not displaying selected users correctly.

- Fixed an issue where users were not being notified when they were paused in a project.

- Fixed an issue where Chat messages were not being exported with JSON_MIN and CSV.

- Fixed an issue where a blank page would display instead of a 404 page when attempting to access a non-existent page.

- Fixed an issue with and agreement calculation error when a custom label weight is set to 0%.

- Fixed an issue in which long URLs would cause errors.

- Fixed an issue affecting the workspace dropdown on the Member Performance Dashboard.

- Fixed several issue with AI-assisted project setup.

- Fixed an an issue with the Annotation Limit project setting in which users could not set it by a percentage and not a fixed number.

- Fixed an issue where the style of the tooltip info icons on the Cloud Storage status card was broken.

- Fixed an issue with colors on the Members dashboard.

- Fixed an issue where exports were broken if an annotation had a null result.

- Fixed an issue with the drop-down height when selecting columns in Data Manager filters.

- Fixed an issue where the full list of compatible projects was not being shown when creating a new prompt.

- Fixed an issue in the agreement matrix on the Members dashboard in which clicking links would open the Data Manager with incorrect filters set.




</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2300md"></a>

## Label Studio Enterprise 2.30.0

<div class="onprem-highlight">Databricks storage, Reviewer metrics, multiple UX enhancements</div>

*Oct 15, 2025*

Helm Chart version: [1.11.5](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)


### New features

#### Connect your Databricks files to Label Studio

There is a new cloud storage option to connect your Databricks Unity Catalog to Label Studio.

For more information, see [**Databricks Files (UC Volumes)**](https://docs.humansignal.com/guide/storage#Databricks-Files-UC-Volumes).

Note that PDF import is not currently supported for Databricks source storage.

![Screenshot](/images/releases/2-30-databricks.png)

### Enhancements

#### Reviewer metrics

The [Annotator Performance Dashboard](dashboard_annotator) now includes two new graphs for Reviewer metrics:

![Screenshot](/images/releases/2-30-review-graphs.png)

You can also now find a **Review Time** column in the Data Manager:

![Screenshot](/images/releases/2-30-review-time.png)

!!! note
    Data collection for review time began on September 25, 2025. You cannot view time for reviewing activity that happened before data collection began. 
    
    Review time is measured in seconds.

#### Improved project Annotation settings

The **Annotation** section of the project settings has been improved.

- Clearer text and setting names
- When Manual distribution is selected, settings that only apply to Automatic distribution are hidden
- You can now preview instruction text and styling

For more information, see [Project settings - Annotation](https://docs.humansignal.com/guide/project_settings_lse#Annotation).

![Screenshot](/images/releases/2-30-settings.png)

![Screenshot](/images/releases/2-30-preview.png)

#### Ground truth visibility in the agreement pop-up

When you click the **Agreement** column in the Data Manager, you can see a pop-up with an inter-annotator agreement matrix. This pop-up will now also identify annotations with ground truths.

For more information about adding ground truths, see [Ground truth annotations](ground_truths).

![Screenshot](/images/releases/2-30-popover.png)

#### Sort video and audio regions by start time

You can now sort regions by media start time.

Previously you could sort by time, but this would reflect the time that the region was created. The new option reflects the start time in relation to the media.

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/media-start-time-sort.mp4">
</video>


#### Support for latest Gemini models

When you add Gemini or Vertex AI models to Prompts or to the organization model provider list, you will now see the latest Gemini models.

**gemini-2.5-pro**

**gemini-2.5-flash**

**gemini-2.5-flash-lite**


#### JSON array input for the Table tag

Previously, the [Table tag](/tags/table) only accepted key/value pairs, for example:

```json
{
  "data": {
    "table_data": {
      "user": "123456",
      "nick_name": "Max Attack",
      "first": "Max",
      "last": "Opossom"
    }
  }
}
```

It will now accept an array of objects as well as arrays of primitives/mixed values. For example:

```json
{
  "data": {
    "table_data": [
      { "id": 1, "name": "Alice", "score": 87.5, "active": "true" },
      { "id": 2, "name": "Bob",  "score": 92.0, "active": "false" },
      { "id": 3, "name": "Cara", "score": null, "active": "true" }
    ]
  }
}
```

#### Template search

You can now search the template gallery. You can search by template title, keywords, tag names, and more.

Note that template searches can only be performed if your organization has AI features enabled.

![Screenshot](/images/releases/2-30-templates.png)

#### New parameters for the Video tag

The [Video tag](/tags/video) now has the following optional parameters:

- `defaultPlaybackSpeed` - The default playback speed when the video is loaded.
- `minPlaybackSpeed` - The minimum allowed playback speed.

The default value for both parameters is `1`.


### Miscellaneous UX improvements

- Owners and Admins will now see a shortcut from the Home page to the Annotator Performance Dashboard.

- On [images](/tags/image), the `smoothing` parameter is now automatically set to `false` by default when using with the [BitmaskLabels tag](/tags/bitmasklabels).


#### Multiple SDK enhancements

We have continued to add new endpoints to our SDK. See our [**SDK releases**](https://github.com/HumanSignal/label-studio-sdk/releases).


#### Performance improvements and optimizations

Multiple performance optimizations for pages and actions.


### Breaking changes

Starting with this release, we will be using an [Alpine Docker image](https://hub.docker.com/_/alpine). Previously we used Debian Trixie. 

If you build on top of our image, update your `FROM` line and replace `apt-get` with `apk`.

### Bug fixes

- Fixed an issue where long taxonomy labels would not wrap.

- Fixed an issue where the /version page was not working.

- Fixed an issue where when duplicating older projects tab order was not preserved.

- Fixed several issues related to manual pausing.

- Fixed an issue where the **Updated by** field was not displaying the most recent user to modify the task.

- Fixed an issue where deleted users remained listed in the organization members list.

- Fixed an issue where clicking a user ID on the **Members** page redirected to the Data Manager instead of copying the ID.

- Fixed an issue where buttons on the **Organization** page were barely visible in Dark Mode.

- Fixed an issue where the **Members** modal would sometimes crash when scrolling.

- Fixed an issue where the Data Manager appeared empty when using the browser back button to navigate there from the **Settings** page.

- Fixed an issue where navigating back to the Data Manager from the project **Settings** page using the browser back button would sometimes lead to the Import button not opening as expected.

- Fixed an issue where clicking the **Label All Tasks** drop-down would display the menu options in the wrong spot.

- Fixed an issue where deleted users were appearing in project member lists.

- Fixed an issue where the default value in the TTL field in the organization-level API token settings exceeded the max allowed value in the field.

- Fixed several validation issues with the **Desired ground truth score threshold** field.

- Fixed an issue where Reviewers who were in multiple organizations and had Annotator roles elsewhere could not be assigned to review tasks.

- Fixed an issue where users who belong to more than one organization would not be assigned project roles correctly.

- Fixed an issue where export conversions would not run if a previous attempt had failed.

- Fixed an issue when selecting project members where the search functionality would sometimes display unexpected behavior.

- Fixed an issue where, when opening statistic links from the Members dashboard, closing the subsequent tab in the Data Manager would cause the page to break.

- Fixed an issue with LDAP logins.

- Fixed an issue where videos could not be displayed inside collapsible panels within the labeling config.

- Fixed an issue where taxonomies were not properly displayed in the labeling config edtiro preview.

- Fixed an issue with displaying audio channels when `splitchannels="true"`.

- Fixed an issue preventing annotations from being exported to target storage when using Azure blob storage with Service Principal authentication.

- Fixed an issue with the **Scan all sub-folders** option when using Azure blob storage with Service Principal authentication.

- Fixed an issue where video files would not open using Azure blob storage with Service Principal authentication when pre-signed URLs were disabled.

- Fixed an issue that was sometimes causing export conversions to fail.

- Fixed an issue where users assigned to tasks were not removed from the list of available users to assign.

- Fixed an issue with color definitions getting unexpectedly updated in whitelabeled environments.

- Fixed an issue where API taxonomies were not loading correctly.

- Fixed an issue where the **Scan all subfolders** toggle was appearing for all cloud storage types, even though it is only applicable for a subset.

- Fixed and issue where the **Low agreement strategy** project setting was not updating on save when using a custom matching function.

- Fixed an issue where the Data Manager was not loading for certain projects.

- Fixed an issue where the **Show Log** button was disappearing after deploying a custom matching function.

- Fixed an issue where the **Start Reviewing** button was broken for some users.





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2290md"></a>

## Label Studio Enterprise 2.29.0

<div class="onprem-highlight">New Chat tag, Azure Blob Storage with Service Principal authentication, filtering enhancements, improved UX</div>

*Sep 26, 2025*

Helm Chart version: [1.11.2](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

### New features

#### Annotate conversations with a new Chat tag

Chat conversations are now a native data type in Label Studio, so you can annotate, automate, and measure like you already do for images, video, audio, and text.

For more information, see:

[**Chat tag page**](/tags/chat.html)

[**Chat labeling templates**](/templates/gallery_chat)

[**Blog - Introducing Chat: 4 Use Cases to Ship a High Quality Chatbot**](https://humansignal.com/blog/introducing-chat-4-use-cases-to-ship-a-high-quality-chatbot/)

![Screenshot](/images/releases/2-29-chat.png)

### Enhancements

#### One-click annotation for audio-text dialogues

When labeling paragraphs in dialogue format (`layout="dialogue"`), you can now apply labels at an utterance level.

There is a new button that you can click to apply the selected label to the entire utterance. You can also use the pre-configured `Command + Shift + A` hotkey:

![Screenshot](/images/releases/2-29-audio-text.png)

#### Adjustable height for audio players

While you can still adjust the default height in the labeling configuration, now users can drag and drop to adjust the height as needed.

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/2_29_adjust.mp4">
</video>

#### Support for Azure Blob Storage with Service Principal authentication

You can now connect your projects to Azure Blob Storage using Service Principal authentication.

Service Principal authentication uses Entra ID to authenticate applications rather than account keys, allowing you to grant specific permissions and can be easily revoked or rotated. For more information, see [Azure Blob Storage with Service Principal authentication](https://docs.humansignal.com/guide/storage#Azure-Blob-Storage-with-Service-Principal-authentication).

<img style="max-width: 825px" src="/images/releases/2-29-azure.png" alt="Screenshot"/>

#### Redesigned cloud storage modal

When adding cloud storage, the modal has now been redesigned to add clarity and additional guidance to the process.

For example, you can now preview a list of files that will be imported in order to verify your settings.

<img style="max-width: 800px" src="/images/releases/2-29-cloud-storage-modal.png" alt="Screenshot"/>


#### Debug custom agreement metrics

There is a new **See Logs** option for [custom agreement metrics](custom_metric), which you can use to view log history and error messages.

<img style="max-width: 500px" src="/images/releases/2-29-debug-metrics.png" alt="Screenshot"/>

#### Nested annotator filter

When applying an annotation results filter, you will now see a nested Annotator option. This allows you to specify that the preceding filter should be related to the specific annotator.

For example, the following filter will retrieve any tasks that have an annotation with choice "bird" selected, and also retrieve any tasks that have an annotation submitted by "Sally Opossum."

This means if you have a task where "Max Opossum" and "Sally Opossum" both submitted annotations, but only Max chose "bird", the task would be returned in your filter.

![Screenshot](/images/releases/2-29-nested1.png)

With the new nested filter, you can specify that you only want tasks in which "Sally Opossum" selected "bird":

![Screenshot](/images/releases/2-29-nested2.png)

#### Filter by prediction results

You can now filter prediction results by selecting options that correspond to control tag values.

Previously, you could only filter using an unstructured text search.

The prediction results filter also includes a nested model version filter, which (if specified) will ensure that your filters returns tasks only when the selected prediction result comes from the selected model.

![Screenshot](/images/releases/2-29-prediction-filter.png)

#### Hide Data Manager columns from users

There is a new project setting available from **Annotation > Annotating Options** and **Review > Reviewing Options** called **Show unused data columns to reviewers in the Data Manager**.

This setting allows you to hide unused Data Manager columns from any Annotator or Reviewer who also has permission to view the Data Manager.

"Unused" Data Manager columns are columns that contain data that is not being used in the labeling configuration.

For example, you may include meta or system data that you want to view as part of a project, but you don't necessarily want to expose that data to Annotators and Reviewers.

<img style="max-width: 600px" src="/images/releases/2-29-dm-columns.png" alt="Screenshot"/>

#### Manager and Reviewer access to the Annotator Dashboard

Managers and Reviewers will now see a link to the Annotator Dashboard from the Home page.

The [**Annotator Dashboard**](dashboard_annotator) displays information about their annotation history.

**Managers:**

![Screenshot](/images/releases/2-29-apd-manager.png)

**Reviewers:**

![Screenshot](/images/releases/2-29-apd-reviewer.png)

#### Show models in the Members dashboard

If your project is using predictions, you will now see a **Show Models** toggle on the [Members dashboard](https://docs.humansignal.com/guide/dashboard_members).

This will allow you to view model agreement as compared to annotators, other models, and ground truths.

![Screenshot](/images/releases/2-29-show-models.png)


#### Set model provider API keys for an organization

There is a new **Model Providers** page available at the organization level where you can configure API keys to use with LLM tasks.

If you have previously set up model providers as part of your Prompts workflow, they are automatically included in the list.

For more information, see [Model provider API keys for organizations](https://docs.humansignal.com/guide/model_providers).

![Screenshot](/images/releases/2-29-model-providers.png)


#### Improved UX on the Organization page

The Organization page (only accessible to Owner and Admin roles) has been redesigned to be more consistent with the rest of the app.

Note that as part of this change, the [**Access Token**](https://docs.humansignal.com/guide/access_tokens) page has been moved under **Settings**.

**Before:**

![Screenshot](/images/releases/2-29-org-before.png)

**After:**

![Screenshot](/images/releases/2-29-org-after.png)

#### New email notification option for users who are not activated

Administrators and Owners can now opt in to get an email notification when a new user logs in who has not yet been assigned a role.

Like all email preferences, this can be disabled and hidden for the whole organization on the **Organization > Usage and License** page. 

![Screenshot](/images/releases/2-29-not-activated.png)


#### Apply labels from multiple `<Labels>` controls

When you have a labeling configuration that includes multiple `<Labels>` blocks, like the following:

```xml
<View>
<Text name="text" value="$text" granularity="word"/>
<Labels name="category" toName="text" choice="single">
  <Label value="Animal" background="red"/>
  <Label value="Plant" background="darkorange"/>
</Labels>
<Labels name="type" toName="text" choice="single">
  <Label value="Mammal" background="green"/>
  <Label value="Reptile" background="gray"/>
  <Label value="Bird" background="blue"/>
</Labels>
</View>
```

You can now choose multiple labels to apply to the selected region. 

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/2-29-multilabels.mp4">
</video>

#### Multiple SDK enhancements

We have continued to add new endpoints to our SDK. See our [**SDK releases**](https://github.com/HumanSignal/label-studio-sdk/releases).

#### Miscellaneous UX improvements

- Various improvements to the list view for the Projects page.

- Improvements to sorting and buttons for the grid view of the Projects page.

- Each user has a numeric ID that you can use in automated workflows. These IDs are now easier to quickly find through the UI.

    You can find them listed on the **Organization** page and in the **Annotation Summary** table on the **Members** page for projects.

- When loading the Data Manager in which you have not yet imported data, you will now see a more helpful interface.

- When duplicating a project, you will now see a modal with an updated UI and more helpful text.

#### Performance improvements and optimizations

Multiple performance optimizations, fine-tuning, and dependency cleanup.

### Bug fixes

- Fixed an issue with the disabled state style for the Taxonomy tag on Dark Mode.

- Fixed an issue where users were able to select multiple values when filtering annotation results despite multiselect not being compatible with the labeling config.

- Fixed an issue that caused project search to not match certain word parts.

- Fixed an issue where long storage titles prevented users from accessing the overflow menu.

- Fixed an issue where the workspaces dropdown from the Annotator Performance page would disappear if the workspace name were too long.

- Fixed an issue where imported child choices were not selectable when using the `leafsOnly` parameter for taxonomies.

- Fixed an issue with labeling `Text` or `Hypertext` with multiple `Taxonomy` tags at the same time.

- Fixed a small visual issue with the buttons to create tokens.

- Fixed a small issue with column header text alignment in the Data Manager.

- Fixed an issue with export CSV files where the headers did not align with the data within the column.

- Fixed an issue in the project dashboard with tasks not being calculated due to timezone issues.

- Fixed an issue where clicking on an annotator's task count opens the Data Manager with the wrong annotator pre-loaded filter.

- Fixed an issue with the magic wand tool.

- Fixed an issue where, when zoomed in, bounding boxes would shift after being flipped.

- Fixed an issue where too much task information would appear in notification emails.

- Fixed an issue where the workspaces list would sometimes get stuck loading.

- Fixed an issue where users would see "The page or resource you were looking for does not exist" while performing resource-intensive searches

- Fixed several issues related to the user drop-down in the Annotator Performance Dashboard.

- Fixed an issue with pausing annotators in projects with a large number of users.

- Fixed an issue where an empty Import modal would be shown briefly when uploading a file.

- Fixed an issue with duplicate entries when filtering for annotators from the Data Manager

- Fixed an issue where users would sometimes see a 404 error in the labeling stream when there were skipped or postponed tasks.

- Fixed several issues related to loading the Annotator Performance dashboard.

- Fixed an issue where audio and video would be out of sync when working with lengthy videos.

- Fixed an issue with a 500 error in the Django Admin panel.

- Fixed several issues related to loading the Members page and Members modal.

- Fixed an issue where predictions with empty results could not pass validation.

- Fixed an issue where on tasks with more than 10 annotators, the number of extra annotators displayed in the Data Manager column would not increment correctly.

- Fixed an issue where users in the Manager role were shown a permissions error when attempted to access the **Settings > Cloud Storage** page.

- Fixed a small issue in the Members modal where empty space was not being filled.

- Fixed an issue where in some cases Owners and Admins could be removed from workspace membership.

- Fixed an issue where the Copy button was not showing the correct state in some instances

- Fixed an issue where the Info panel was showing conditional choices that were not relevant to the selected region.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2280md"></a>

## Label Studio Enterprise 2.28.0

<div class="onprem-highlight">Bitmasks, custom hotkeys, annotation summaries, project page improvements, and more</div>

*Aug 28, 2025*

Helm Chart version: [1.11.1](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

### New features

#### Bitmask support for precise image annotation

We’ve introduced a new BitMask tag to support pixel-level image annotation using a brush and eraser. This new tag allows for highly detailed segmentation using brush-based region and a cursor that reflects brush size down to single pixels for fine detail. We’ve also improved performance so it can handle more regions with ease.

Additionally, Mac users can now use two fingers to pinch zoom and pan images for all annotation tasks.

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/bitmask.mp4">
</video>

For more information, see [BitmaskLabels](/tags/bitmasklabels).

#### Custom global hotkeys

You can now [**configure global hotkeys**](hotkeys) for each user account. These are available from the **Account & Settings** page.

![Screenshot of hotkeys](/images/releases/2-28-hotkeys.png)


#### Annotation summary by task

When using the **View All** action, users who are in the Reviewer role or higher can now see a summary of the annotations for a specific task. This summary includes metadata, agreements, and side-by-side comparisons of labels.

You can use this summary for a more efficient and detailed review of annotated tasks and to better understand consensus and discrepancies, especially when needing to compare the work of multiple annotators.

![Screenshot of summary](/images/releases/2-28-summary.png)

### Enhancements

#### SDK 2.0.0

We released a new version of the SDK, with multiple functional and documentation enhancements. 

* [Documentation](https://api.labelstud.io/)

* [Release notes](https://github.com/HumanSignal/label-studio-sdk/releases/tag/2.0.0)

!!! warning
     This release contains breaking changes. If you are currently using the Label Studio SDK package in any automated pipelines, we strongly recommend pinning your SDK version to <2.0.0.

#### Settings for TimelineLabels configurations

When you are using a labeling configuration that includes [`<TimelineLabels>`](/tags/timelinelabels), you will now see a settings icon.

![Screenshot](/images/releases/2-28-settings.png)

From here you can specify the following:

- Playback speed for the video
- Whether to loop timeline regions

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/2-28-settings.mp4">
</video>

#### Bulk annotation actions for annotators

Previously, the [bulk annotation actions](labeling_bulk) were only available to users in the Reviewer role or Manager and higher.

Now, users in the Annotator role can access these action.

Note that this is only available when the project is using Manual distribution and annotators must have access to the Data Manager.

#### Project page improvements

You now have the option to view the **Projects** page in list format rather than as a grid of cards:

![Screenshot](/images/releases/2-28-projects.png)

In the list view, you see will a condensed version of the project information that includes fewer metrics, but more projects per page:

**(Admin view)**

![Screenshot](/images/releases/2-28-projects-admin.png)

**(Annotator view)**

![Screenshot](/images/releases/2-28-projects-ann.png)

##### Search and sort projects

This change also includes a new option to sort projects (available in either view):

![Screenshot](/images/releases/2-28-projects-sort.png)

You can also now search by project description and project ID.

![Screenshot](/images/releases/2-28-projects-search.png)

#### Workspace improvements

There have been several improvements to the workspace list:

- The list is now sorted alphabetically.
- When editing the project settings and selecting a workspace in which to move the workspace, the drop-down list is now searchable.
- You can now click a link in the project breadcrumbs to navigate back to a specific workspace.

![Screenshot](/images/releases/2-28-workspace.png)

#### GPT-5 models for Prompts

When using an OpenAI API key, you will now see the following models as options:

`gpt-5`

`gpt-5-mini`

`gpt-5-nano`

#### Organization-level control over email notifications

The **Organization > Usage & License** page has new options to disable individual email notifications for all members in the organization.

If disabled, the notification will be disabled for all users and hidden from their options on their **Account & Settings** page.

![Screenshot](/images/releases/2-29-emails.png)

#### Export data from the Members page

There is a new option on the **Members** page to export Annotation Summary data to CSV:

![Screenshot](/images/releases/2-28-export.png)


#### Support for high-frequency rate time series data

You can now annotate time series data on the sub-second decimal level.

!!! note 

    Your time format must include `.%f` to support decimals. For example:

    `timeFormat="%Y-%m-%d %H:%M:%S.%f"`

![Screenshot](/images/releases/2-28-highfreq.png)

#### Snap bounding boxes to pixels

The [**`<Rectangle>`**](/tags/rectangle) and [**`<RectangleLabels>`**](/tags/rectanglelabels) tags now include the `snap` parameter, allowing you to snap bounding boxes to pixels.

!!! info tip
    To see a pixel grid when zoomed in on an image, you must disable pixel smoothing. This can be done as a parameter on the [**`<Image>`**](/tags/image) tag or from the user settings.

#### Define the default collapsed state

The [**`<Collapse>`**](/tags/collapse) tag now includes an `open` parameter. You can use this to specify whether a content area should be open or collapsed by default.

#### Configure whether to display spectrograms in the labeling configuration

There is a new `spectrogram` parameter for the [**`<Audio>`**](/tags/audio) tag, allowing you to show spectrograms by default

#### New `include` and `filter` fields for the project list API

The [**List all projects**](https://api.labelstud.io/api-reference/api-reference/projects/list) call has been updated with `include` and `filter` parameters.

#### New query params for organization membership

When listing organization members via the API, you can use two new query params to exclude project or workspace members:

`exclude_project_id`

`exclude_workspace_id`

#### Miscellaneous usability and performance improvements

- Removed the default zoom level calculation for Audio, allowing it to render the full waveform by default.

- The **Add Source Storage** modal has been improved for clarity.

- UX improvements for labeling interface information panels.

- Ask AI is now on by default for all new accounts.

- Email notifications are now opt-in for existing user accounts

- Improved error handling and data persistence when saving annotations and reviews.

- Improved error messages when data import fails.

- Improved status visibility when duplicating projects. 


### Breaking changes

- `/api/projects/{project_id}/export` is deprecated

- Page size on `/api/projects` API is now limited to 100 projects


### Security

- Fixed a Koa.js XSS vulnerability tied to a redirect function.

- Added improved password validation.


### Bug fixes

- Fixed various issues associated with dark mode.
- Fixed various issues whitelabeled environments
- Fixed various UI issues associated with buttons and tooltips.
- Fixed an issue where project duplication failed if the user changed a setting before the duplication process completed.
- Fixed an issue where the `/api/tasks` endpoint timed out with a large number of annotations.
- Fixed an issue with incorrect button text size.
- Fixed an issue where scores were not recalculated after using the **Propagate Annotations** experimental action.
- Fixed an issue where non-visible annotations were incorrectly submitted when using Choices.
- Fixed an issue affecting project roles for users promoted to manager or admin within the organization.
- Fixed an issue where the **Manage Member** modal selected all project members regardless of the active search filter.
- Fixed an issue where the error indicator is not visible when creating a project.
- Fixed an issue that caused avatars to overflow the table cell in the Data Manager.
- Fixed an issue where the **Session Timeout** Policy fields on the **Usage & License** page lacked min/max parameters and inline validation.
- Fixed an issue that prevented the **Request Seats** button from working on the **Usage & License** page.
- Fixed an issue where email notification preference checkboxes displayed incorrectly.
- Fixed an issue where the threshold when configuring task agreement was not sending values correctly.
- Fixed an issue with the initial display of `Timeseries` when used with the `MultiChannel` tag.
- Fixed an issue where **Fix+Accept** was not shown when a reviewer made changes.
- Fixed an error that occurred when calculating scores for tasks.
- Fixed an issue that where the data import page did not display correctly after importing a CSV file.
- Fixed an issue where the workspace members modal sometimes displayed clipped content with no scroll option.
- Fixed an issue where user pause actions based on annotator evaluation could occur without all stats being present.
- Fixed a visual glitch on the import modal where UI elements sometimes wrapped to a new line unexpectedly.
- Fixed an issue where filters disappeared in the Data Manager and could not be edited after changes to filters or columns.
- Fixed an issue where RichText Tags were not rendering correctly on Firefox due to cross-browser compatibility problems.
- Fixed an issue where accessing certain pages while logged out resulted in a blank screen instead of redirecting to the login page.
- Fixed an issue causing vertical displacement of TimeSeries charts with large datasets and specific zoom levels, sometimes shifting the chart beyond the visible screen area.
- Fixed an issue where LDAP user signup was broken in recent Label Studio Enterprise versions.
- Fixed an issue that prevented audio regions from being visualized over the full interface in split channel mode.
- Fixed an issue where audio failed to render the full waveform when zoomed out at the page level.
- Fixed an out-of-memory issue caused by prompts cost estimates.
- Fixed an issue with incorrect rendering height of split channel audio.
- Fixed an issue where documentation links opened in the same browser window instead of a new tab.
- Fixed an issue where creating a new tab in the Data Manager caused the tab to move to the front after refreshing the page.
- Fixed an issue affecting manually entering the end time for an audio region.
- Fixed missing performance optimizations and search functionality for tasks in GCS WIF cloud storages.
- Fixed an issue that prevented the **Allow drawing outside of video boundaries** setting from functioning correctly.
- Fixed an issue where bulk labeling was not triggering certain webhook events.
- Fixed an issue where displaying a large amount of data in `TimeSeries` using the `TimeSeriesVisualizer` component caused problems.
- Fixed an issue where the incorrect draft was loaded during task history navigation in label stream.
- Fixed an issue where the eraser tool wasn't working at the single pixel level.
- Fixed an issue where review data wasn't saved to the database if the target storage couldn't write the annotation.
- Fixed an issue where the `page` parameter was not reset to `1` when navigating to **All Projects**.
- Fixed an issue where tasks were duplicated in the Data Manager when sorted by comment text.
- Fixed an issue where the settings interface jumped when users changed settings too quickly.
- Fixed an issue where memory consumption was not optimized during Prompt inference runs.
- Fixed an issue causing reduced performance related to membership API calls.
- Fixed an issue where if a task had more than 10 annotators assigned, you could not see the how many annotators were assigned when viewing the Data Manager.
- Fixed an issue where task data was appearing in certain email notifications.
- Fixed an issue that would sometimes render a user in the Data Manager without a display name.
- Fixed an issue where the taxonomy drop-drop down was not displaying in the labeling interface preview.
- Fixed an issue where deleted users’ avatars were still visible on the Members page.
- Fixed an issue where resizing the labeling interface area would not resize the video player.
- Fixed an issue where the user info popover was not opening in some cases.
- Fixed an issue where a "Duplicating" badge would appear when saving project settings.
- Fixed a small visual issue where the AM/PM options were not centered when selecting date and time.
- Fixed an issue where the video settings modal would not close when clicking away.
- Fixed an issue where the Activity Log page would not always load.
- Fixed an issue where CORS errors would appear for images in duplicated projects if the images had been uploaded directly.
- Fixed an issue where the layout was incorrect when pinning Data Manager filters to the sidebar.
- Fixed an issue where sorting was not working as expected when Data Manager filters were pinned.





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2261md"></a>

## Label Studio Enterprise 2.26.1

<div class="onprem-highlight">Bug fixes</div>

*Aug 25, 2025*

Helm Chart version: [1.11.1](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

- Fixed an issue where task data appeared in notification emails.
- Fixed an issue where Redis usernames were not supported in the wait-for-redis deploy script.








</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2260md"></a>

## Label Studio Enterprise 2.26.0

<div class="onprem-highlight">Time series sync, new Multichannel tag for time series, spectrograms, playground 2.0, annotation result filtering</div>

*Jul 21, 2025*

Helm Chart version: [1.10.0](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

### New features

#### Time series synchronization with audio and video

You can now use the sync parameter to align audio and video streams with time-series sensor data by mapping each frame to its corresponding timestamp.

For more information, see [Time Series Labeling with Audio and Video Synchronization](/templates/timeseries_audio_video).

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/video-time-series-light.mp4">
</video>

#### Group multiple time series in one channel

There is a new [Multichannel tag](#MultiChannel) for visualizing time series data. You can use this tag to combine and view multiple time series channels simultaneously on a single channel, with synchronized interactions.

The Multichannel tag significantly improves the usability and correlation of time series data, making it easier for users to analyze and pinpoint relationships across different signals.

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/timeline.mp4">
</video>


#### Spectrogram support for audio analysis

There is a new option to display audio files as spectrograms. You can further specify additional spectrogram settings such as windowing function, color scheme, dBs, mel bands, and more.

Spectrograms can provide a deeper level of audio analysis by visualizing frequency and amplitude over time, which is crucial for identifying subtle sounds (like voices or instruments) that might be missed with traditional waveform views.

![Image of spectrogram](/images/releases/spectrogram.png)

#### Playground 2.0

The [Label Studio Playground](https://labelstud.io/playground/) is an interactive sandbox where you can write or paste your XML labeling configuration and instantly preview it on sample tasks—no local install required.

The playground has recently been updated and improved, now supporting a wider range of features, including audio labeling. It is also now [a standalone app](https://labelstud.io/playground-app) and automatically stays in sync with the main application.

![Image of playground](/images/releases/2-26-playground1.png)

!!! info Tip
    To modify the data input, use a comment below the `<View>` tags:

    ![Image of playground](/images/releases/2-26-playground2.png)

#### Filter on annotation results

When applying filters, you will see new options that correspond to annotation results.

These options are identified by the results chip and correspond to control tag names and support complex filtering for multiple annotation results. For example, you can filter by “includes all” or “does not include.”

This enhancement provides a much more direct, predictable, and reliable way to filter and analyze annotation results, saving time and reducing the chances of errors previously encountered with regex matching.

For more information, see [Filter annotation results](#Filter-annotation-results).

![Image of filtering by results](/images/releases/2-26-results.png)

### Enhancements

#### Interactive view all

The **View All** feature when reviewing annotations has been improved so that you can now interact with all annotation elements side-by-side, making it easier to review annotations. For example, you can now play video and audio, move through timelines, and highlight regions.

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/viewall.mp4">
</video>

#### Expanded email notifications

Users can now receive email notifications for various actions, including when they are invited to projects and workspaces, assigned tasks, and when a project is published or completed. You can opt out of notifications from the [Account & Settings page](user_account).

![Image of email options](/images/releases/2-26-email.png)

#### Support for JSONL and Parquet

Label Studio now supports more flexible JSON data import from cloud storage. When importing data, you can use JSONL format (where each line is a JSON object), and import Parquet files.

JSONL is the format needed for OpenAI fine-tuning, and the default format from Sagemaker and HuggingFace outputs. Parquet enables smoother data imports and exports for Enterprise-grade systems including Databricks, Snowflake, and AWS feature store,

This change simplifies data import for data scientists, aligns with common data storage practices, reduces manual data preparation steps, and improves efficiency by handling large, compressed data files (Parquet).

!!! note
    **Parquet support:** We do not support importing Parquet files that include predictions and/or annotations. 

#### Improved grid view configurability

You can now configure the following aspects of the Grid View in the Data Manager: 

- **Columns**
- **Fit images to width**

![Image of grid view](/images/releases/2-26-grid.png)

#### Usage & License page visibility

The **Billing & Usage** page has been renamed the **Usage & License** page. Previously this page was only visible to users in the Owner role. A read-only form of this page is now available to all users in the Admin role.

![Image of org page options](/images/releases/2-26-usage.png)

#### Enhanced control and visibility for storage proxies

There are two UI changes related to [storage proxies](#Pre-signed-URLs-vs-Storage-proxies):

- On the **Usage & License** page, a new **Enable Storage Proxy** toggle allows organization owners to disable proxying for all projects within the organization. When this setting is disabled, source storages must enable pre-signed URLs. If they are not enabled, the user will be shown an error when they try to add their source storage.
- On the **Source Storage** window, the toggle controlling whether you use pre-signed URLs now clearly indicates that OFF will enable proxying.

![Image of proxy options](/images/releases/2-26-proxy1.png)

![Image of proxy options](/images/releases/2-26-proxy2.png)

#### Enhanced delete actions from the Data Manager

When deleting annotations, reviews, or assignments, you can now select a specific user for the delete action. Previously, you were only able to delete all instances.

With this change, you will have more granular control over data deletion, allowing for precise management of reviews and annotations.

This enhancement is available for the following actions:

- **Delete Annotations**
- **Delete Reviews**
- **Delete Review Assignments**
- **Delete Annotator Assignments**

![Image of before and after](/images/releases/destructive-before-after.png)

#### Session timeout configuration

Organization owners can use the new **Session Timeout Policies** fields to control session timeout settings for all users within their organization. These fields are available from the **Usage & License** page.

Owners can configure both the maximum session age (total duration of a session) and the maximum time between activity (inactivity timeout).


#### Miscellaneous UX improvements

- Improved the message text seen when building templates using Ask AI.

- Improved the scrolling action for the workspace list, making it easier for orgs with very large workspace lists.

- Users on the Organization page are now sorted by email by default.

- The **Delete Annotator Assignments** action is now disabled when the tooltip is in automatic task distribution mode.

- The **Data Import** step has been redesigned to better reflect the drag and drop target. The text within the target has also been updated for accuracy and helpfulness.

    ![Image of import screen](/images/releases/2-26-import.png)
    
- The empty states of the labeling interface panels have been improved to provide user guidance and, where applicable, links to the documentation.

    ![Image of empty state panels](/images/releases/2-26-empty-state.png)

### Security

- In the Django admin settings, when **Common login enabled** is deselected, signups and invites are now also restricted.

- Webhooks are restricted to administrators.

- Addressed multiple security vulnerabilities.


### Bug fixes

- Fixed UI issues associated with dark mode.

- Fixed UI issues related to whitelabeled environments.

- Fixed small UI issues related to column sizing and padding.
    
- Fixed an issue where certain popovers were not appearing when hovering. 
    
- Fixed an issue that would cause the Data Manager to crash when interacting with the project link in the navigation bar.

- Fix various style issues related to error messages in the storage modal.

- Fixed a server error that would return when fetching project counts.

- Fixed an issue where clicking an option on the project role drop-down menu in the Members modal would cause the modal to close unexpectedly.

- Fixed an issue where in some situations users were not able to navigate after deleting a project.

- Fixed an issue where users were still able to resize TimeLineLabels regions even if locked.

- Fixed an issue where the COCO export option was appearing even if the labeling configuration was not compatible

- Fixed an issue where Label All Tasks was not updating for users in the Reviewer role.

- Fixed an issue which caused workspaces list styles to not apply to the full container when scrolled.

- Fixed an issue where exports were included when duplicating a project.

- Fixed an issue with `ls.tasks.get(TASK_ID)` function in SDK.

- Fixed a minor visual issue with the sidebar.

- Fixed an issue with the **Remove Duplicated Tasks** action where it failed when a user selected an odd number of tasks.

- Fixed an issue with CSV exports when the `Repeater` tag is used.

- Fixed an issue where inactive admins would appear in the project members list and could not be removed.

- Fixed an issue with overflow and the date picker.

- Fixed a validation error when updating the labeling configuration of existing tasks through the API.

- Fixed an issue where audio regions would not reflect multiple labels.

- Fixed an issue that was causing incorrect task overlap calculation.

- Fixed an issue where the Plugins editor was not visible at certain zoom levels.

- Fixed an issue with overflow and some drop-down menus.

- Fixed an issue where resolved and unresolved comment filters were not working due to a bug in the project duplication process.

- Fixed an issue where PDF files could not be imported through the Import action.

- Fixed an issue where predictions from Prompts were not always displayed in Quick View.

- Fixed an issue where some non-standard files such as PDFs were not correctly displayed in Quick View if using nginx.

- Fixed an issue where the review stream was opening a blank page when specific labeling configs ere used.

- Fixed a small UI issue related to how project-level roles appear between modals.

- Fixed an issue where the step parameter on the `<Number>` tag was not working as expected.


- Fixed an issue where NER entities were misplaced when using Prompts.

- Fixed an issue where the API call for rotating tokens was not setting the expiration correctly on new tokens.

- Fixed an issue where incorrect fonts were being used in the Labeling Interface settings.

- Fixed an issue where filters created in a project that had been duplicated would be shared back to the original project.

- Fixed an issue where information in **Show task source** would extend outside the modal.

- Fixed an issue where annotator limit and evaluation settings were not kept when duplicating projects.

- Fixed an issue where users will now see a warning if they try to configure a custom agreement metric that is incompatible with the current labeling configuration.

- Fixed an issue where users could not see Personal Access Token information after closing the create modal.

- Fixed an issue with tooltip alignment.

- Fixed an issue where nested toggles were not working as expected.

- Fixed an issue where there was overlap after duplicating and then flipping regions.

- Fixed an issue where Prompts would return an error when processing large PDFs.

- Fixed an issue where the agreement score popover did not appear for tasks that included a ground truth annotation.

- Fixed an issue where hovering over a relative timestamp did not display the numerical date.

- Fixed an issue where the hotkey for the Number tag was not working.

- Fixed an issue where the date picker for dashboards was extending beyond the viewport

- Fixed an issue where task agreement was not always calculated in cases where annotators skipped tasks.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2250md"></a>

## Label Studio Enterprise 2.25.0

<div class="onprem-highlight">Prompts on-prem availability, storage proxies, PDF tag, KeyPointLabels support, multi-task JSON imports for cloud</div>

*Jun 17, 2025*

Helm Chart version: [1.9.15](https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/Chart.yaml)

### New features

#### Prompts availability for on-prem deployments

You can now configure your on-prem environment to use Prompts! 

Prompts is an interface to easily integrate LLMs into your own Label Studio deployment. Leading teams use it to pre-label data, compare models, and generate synthetic samples.

You can find out more here:

* [Prompts overview](prompts_overview)
* [Prompts product page](https://humansignal.com/platform/prompts/)
* [Blog - How to Generate Synthetic Data with Prompts in Label Studio](https://humansignal.com/blog/how-to-generate-synthetic-data-with-prompts-in-label-studio/)


Installing Prompts requires license enablement and [additional install steps](install_prompts). Reach out to your CSM to enable a free trial!

![Stylized image of Prompts](/images/releases/dog-prompts.png)

#### Storage proxies for cloud files

Label Studio now uses a proxy when accessing media files in connect cloud storages. For more information, see [Pre-signed URLs vs. storage proxies](https://docs.humansignal.com/guide/storage#Pre-signed-URLs-vs-Storage-proxies).

Proxy mode is only used when the **Use pre-signed URLs** option is disabled in source storage.

Storage proxies offer secure media access, simplified configuration, and improved performance.

- Keeps data access within Label Studio's network boundary, ideal for on-premise environments
- Enforces strict task-level access control, even for cached files
- Eliminates the need for presigned URLs and CORS configuration
- Solves performance and reliability issues for large files, videos, and audio
- Media is now streamed via proxy, improving compatibility and scalability

#### New PDF tag

A [new PDF tag](/tags/pdf) lets you directly ingest PDF URLs for classification without needing to use hypertext tags.

This also simplifies the process for using PDFs with Prompts for summarization and classification tasks. 



### Enhancements

#### KeyPointLabels exports for COCO and YOLO

COCO and YOLO export formats now available for `KeyPointLabels`. For more information, see [our docs](https://docs.humansignal.com/guide/export#COCO). 

#### Multi-task JSON imports for cloud

Previously, if you loaded JSON tasks from source storage, you could only configure one task per JSON file.

This restriction has been removed, and you can now specify multiple tasks per JSON file as long as all tasks follow the same format.

For more information, see the examples in our [our docs](https://docs.humansignal.com/guide/storage#Off).


#### Miscellaneous

- The **Export Underlying Data** option was recently introduced and is available from the Annotations chart in the [annotator performance dashboard](dashboard_annotator). This allows you to export information about the tasks that the selected users have annotated. 

    Previously, users were only identified by user ID within the CSV. With this update, you can also identify users by email.

- User interface enhancements for the AI Assistant, including a new icon.


### Bug fixes

- Fixed various user interface issues associated with the new dark mode feature.

- Fixed an issue where the **Not Activated** role was hidden by default on the Organization page.

- Fixed several small issues related to the annotator agreement score popover.

- Fixed an issue where when moving around panels in the labeling interface, groups were not sticking in place.

- Fixed an issue where the token refresh function was not using the user-supplied `httpx_client`.

- Fixed an issue with cloud storage in which tasks would not resolve correctly if they referenced data in different buckets.

- Fixed an issue where the drop-down menu to select a user role was overflowing past the page edge.







</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2240md"></a>

## Label Studio Enterprise 2.24.0

<div class="onprem-highlight">Dark mode, new home page, annotator evaluation settings, plugins library, and multiple usability enhancements</div>

*May 20, 2025*

Helm Chart version: 1.9.10

### New features

#### Dark mode

Label Studio can now be used in dark mode.

Click your avatar in the upper right to find the toggle for dark mode.

- **Auto** - Use your system settings to determine light or dark mode.
- **Light** - Use light mode.
- **Dark** - Use dark mode.

!!! note
    Dark mode is not available for environments that use white labeling. 

![Screenshot of dark mode](/images/releases/2-24-dark-mode.png)

![Animated gif of dark mode](/images/releases/2-24-darkmode.gif)

![Screenshot of dark mode](/images/releases/2-24-dark-mode2.png)


#### New Label Studio Home page

When you open Label Studio, you will see a new Home page. Here you can find links to your most recent projects, shortcuts to common actions, and links to frequently used resources

![Screenshot of home page](/images/releases/2-24-home.png)

!!! note
    The home page is not available for environments using whitelabeling. 

#### Annotator Evaluation settings

There is a new Annotator Evaluation section under **Settings > Quality**.

When there are ground truth annotations within the project, an annotator will be paused if their ground truth agreement falls below a certain threshold.

For more information, see [**Annotator Evaluation**](https://docs.humansignal.com/guide/project_settings_lse#annotator-eval).

<img src="/images/releases/2-24-evaluation.png" style="max-width:600px; margin: 0 auto" alt="Screenshot of evaluation settings">

#### New Insert Plugins menu and Testing interface

There are a number of new features and changes related to plugins:

- There is a new **Insert Plugins** menu available. From here you can insert a pre-built plugin that you can customize as necessary.
- When you add a plugin, you will see a new **Testing** panel below the plugin editing field. You can use this to verify what events are triggered, manually trigger events, and modify the sample data as necessary.
- To accompany the new **Insert Plugins** menu, there is [a new Plugins gallery](https://docs.humansignal.com/plugins/) in the documentation that discusses each option and has information on creating your own custom plugs.
- There is also a new setting that allows you to restrict access to the Plugins tab to Administrator users. By default, it is also available to Managers. This can be set through the Django admin panel. 

![Screenshot of plugins](/images/releases/2-24-plugin-menu.png)

![Screenshot of plugins](/images/releases/2-24-plugin-test.png)

### Enhancements

#### Agreement score popover in Data Manager

Click any agreement score to view pairwise agreement scores with others.

![Screenshot of agreement popover](/images/releases/2-24-agreement-popover.png)

#### Adjustable text spans

You can now click and drag to adjust text span regions.

![Animated gif of text span drag and drop](/images/releases/2-24-text-drag.gif)

#### Dynamic brush sizes

The cursor now adjusts dynamically to brush size to allow for more precision in segmentation tasks.

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/releases/brush-size.mp4">
</video>
 
#### Support for BrushLabels export to COCO format

You can now export polygons created using the BrushLabels tag to COCO format.

#### Create support tickets through AI Assistant

If you have AI Assistant enabled and ask multiple questions without coming to a resolution, it will offer to create a support ticket on your behalf:

<img src="/images/releases/2-24-ai-ticket.png" style="max-width:600px; margin: 0 auto" alt="Screenshot of AI assistant">

#### Clear chat history in AI Assistant

You can now clear your chat history to start a new chat.

<img src="/images/releases/2-24-ai-new.png" style="max-width:600px; margin: 0 auto" alt="Screenshot of AI assistant">

#### Export underlying data from the Annotator Performance dashboard

There is a new **Export Underlying Data** action for the Annotations chart.

![Screenshot of agreement popover](/images/releases/2-24-export.png)

#### Annotators can now view their own performance dashboard metrics

When logging in, annotators will now see a link to the Annotator performance dashboard, where they can see their own performance metrics. 

<img src="/images/releases/2-24-annotator-dashboard.png" style="max-width:600px; margin: 0 auto" alt="Screenshot of annotator dashboard button">

#### Improved drop-down selectors

When there are a large number of options in a drop-down menu, you can now search through the list of available options.

<img src="/images/releases/2-24-drop-down.png" style="max-width:400px; margin: 0 auto" alt="Screenshot of annotator dashboard button">

#### Label Studio Converter CLI

When you install the Label Studio SDK, you can now use the `label-studio-converter` command from your terminal.

#### Miscellaneous

- Performance enhancements around how membership API requests are made.

- Added a new API call to rotate JWT tokens: [POST api/token/rotate](https://app.heartex.com/api/token/rotate/)


### Security

- Addressed a CSP issue by removing `unsafe-eval` usage.

- Added a rule that password resets will be limited to 5 per hour.

- Upgraded Babel to address vulnerabilities.

- Improved security on CSV exports.

- Removed an unused endpoint.

- By default, CORS is permissive. However, you can now set an environment variable to ensure it is in strict mode. Set **one** of the following:
    - `CORS_ALLOWED_ORIGINS`  
     A comma-separated list of Origin header values the Label Studio server will receive, e.g. `https://example.org,https://example.net`

    - `CORS_ALLOWED_ORIGIN_REGEXES`  
      Same as above, except using regex. 
    - `CORS_ALLOW_ALL_ORIGINS`  
        Set to `false` or `0` to reject all Origin header values (that is, allow no cross-origin requests). By default this is set to `true`. 



### Bug fixes

- Fixed an issue where interacting with the Manage Members modal would sometimes throw an error.

- Fixed an issue where white-labeled Label Studios instances were showing the incorrect logo.

- Fixed an issue where the `Filter` tag did not work with `Choices` tags.

- Fixed an issue where annotators were seeing a misleading message that a project was not ready, even though the project was completed.

- Fixed a server worker error related to regular expressions.

- Fixed several small visual issues with the AI assistant.

- Fixed an issue that was causing multiple annotators to be assigned to tasks beyond the overlap settings.

- Fixed an issue where “Deleted User” repeatedly appeared in filter drop-down menus.

- Fixed an issue where clicking on the timeline region in the region list did not move the slider to the correct position.

- Fixed an issue where a "Script running successfully" message continuously appeared for users who had plugins enabled.

- Fixed an issue where the drop-down menu to select a user role was overflowing past the page edge. 
  
- Fixed an issue where the `visibleWhen` parameter was not working when used with a taxonomy.

- Fixed an issue where there were some UI inconsistencies that would occur during certain page navigations.

- Fixed an issue where certain drop-down menus were inaccessible at different zoom levels.

- Fixed an issue where the Data Manager would go blank when filtering by the predicted model version.

- Fixed an issue where, if a 500 error was returned when syncing storage, the user would not see the error.

- Fixed an issue where forward and rewind hotkeys for audio were not working.

- Fixed an issue where the bars in the Tasks graph on the project dashboard were not accurately grouped by `reviewed_at` or `completed_at`.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2230md"></a>

## Label Studio Enterprise 2.23.0

<div class="onprem-highlight">Google Cloud Storage WIF, drag-and-drop for video timelines, multiple security enhancements</div>

*Apr 22, 2025*

Helm Chart version: 1.9.9

### New features

#### Support for Google Cloud Storage Workload Identity Federation (WIF)

When adding project storage, you now have the option to choose Google Cloud Storage WIF.

Unlike the the standard GCS connection using application credentials, this allows Label Studio to request temporary credentials when connecting to your storage.

For more information, see [Google Cloud Storage with Workload Identity Federation (WIF)](https://docs.humansignal.com/guide/storage#Google-Cloud-Storage-with-Workload-Identity-Federation-WIF).

![Screenshot of WIF](/images/releases/2-23-wif.png)

!!! note
    While this option is available for on-prem users, the typical way to set up GCS in an on-prem environment is through persistent storage as documented [here](https://docs.humansignal.com/guide/persistent_storage.html#Configure-the-GCS-bucket). 


### Enhancements

#### Drag-and-drop adjustment for video timeline segments

You can now drag and drop to adjust the length of video timeline segments.

![Screenshot of video timeline](/images/releases/2-23-drag-drop.png)

#### "Custom Scripts" are now "Plugins"

We have renamed "Custom Scripts" to "Plugins." This is reflected in the UI and [in our docs](/plugins).

![Screenshot of video timeline](/images/releases/2-23-plugins.png)

#### Miscellaneous

- Improved tooltips related to [pausing annotators](quality).

- Ensured that when a user is deactivated, they are also automatically logged out. Previously they lost all access, but were not automatically logged out of active sessions.

- Multiple performance improvements for our [AI Assistant](ask_ai).


### Security

- Made security improvements around the verbosity of certain API calls.

- Made security improvements around SAML.

- Made security improvements around project parameter validation.

- Made security improvements around exception error messages.

- Made security improvements around workspace permission checks.


### Bug fixes

- Fixed an issue where importing from the UI would fail when importing from a URL.

- Fixed an issue where users were unable to edit custom agreement metrics if using manual distribution mode.

- Fixed an issue where regions would be added to the wrong task when moving quickly between tasks.

- Fixed an issue where **Exact frames matching for video** was always showing as an option for agreement metrics regardless of whether the labeling config referenced a video.

- Fixed an issue where the `prediction-changed` value was not being reset after making manual changes to pre-annotations.

- Fixed an issue where a paused annotator is unpaused when a reviewer rejects their annotation and the project is configured to requeue tasks back to the annotator.

- Fixed an issue where some segments were not previewable when annotating videos with the TimeLineLabels tag.

- Fixed several small issues with how labeled regions appear when completing OCR tasks.












</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2221md"></a>

## Label Studio Enterprise 2.22.1

<div class="onprem-highlight">Bug fix</div>

*Apr 07, 2025*

Helm Chart version: 1.9.8

### Bug fixes

- Fixed an issue where role changes with LDAP were broken. 






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2220md"></a>

## Label Studio Enterprise 2.22.0

<div class="onprem-highlight">Pause annotators, set annotation limits, new API tokens, deep linking for annotation and regions, usability improvements for audio</div>

*Mar 25, 2025*

Helm Chart version: 1.9.6

### New features

#### Pause an annotator

There is a new action to pause annotators. This is available from the Members dashboard and via the API.

For more information, see [Pause an annotator](https://docs.humansignal.com/guide/quality#Pause-an-annotator).

![Screenshot of pause](/images/review/pause.png)

#### Annotation limits

There is a new **Quality > Annotation Limit** section in the project settings.

You can use these fields to set limits on how many tasks each user is able to annotate. Once the limit is reached, their progress will be paused.

For more information, see [Annotation Limit](https://docs.humansignal.com/guide/project_settings_lse#annotation-limit).

![Screenshot of annotation limits](/images/releases/2-22-annotation-limit.png)

#### Personal access tokens

There is a new type of token available for API access. The new tokens use JWT standards.

You can enable or disable these tokens from the Organization page. Once enabled, they will be available for users to generate from their Account & Settings page. Legacy tokens can still be used unless disabled from the organization level. 

For more information, see [Access tokens](access_tokens).

![Screenshot of tokens 1](/images/releases/2-22-jwt-org.png)

![Screenshot of tokens 2](/images/releases/2-22-jwt.png)

#### Deep link annotations and regions

You can now link directly to specific annotations or regions within an annotation. These actions are available from the labeling interface in the overflow menus for the annotation and the region. 

![Screenshot of linking annotation](/images/releases/2-22-link-annotation.png)

![Screenshot of linking region](/images/releases/2-22-link-region.png)


### Enhancements

#### Usability improvements for audio tasks

**Scrollbar navigation**

You can now scroll forward and backward within audio files. This can be activated using the scrolling motion on a trackpad or a mouse.

![Screenshot of audio scroll](/images/releases/2-22-audio-scroll.png)

**New settings**

We have introduced two new settings for audio tasks:

- **Auto-Play New Regions -** Automatically play a new region after it has been selected.
- **Loop Regions** - When playing a region, loop the audio.
  
![Screenshot of audio scroll](/images/releases/2-22-audio-settings.png)

#### New templates

There are three new templates available from the template gallery:

- **Natural Language Processing > [Content Moderation](/templates/content_moderation)**
- **Computer Vision > [Medical Imaging Classification with Bounding Boxes](/templates/medical_imaging_classification)**
- **Generative AI > [LLM Response Grading](/templates/llm_response_grading)**

#### Miscellaneous

- Added a link to a user’s performance summary from the Annotation Summary table on the Members dashboard.

- The Label Studio URL format has been updated so that you can now link to specific workspaces.

- Improved 4xx and 5xx error page design to include helpful links.

- Added validation for S3 bucket name formats.

- Performance improvements around notifications and caching.

- Error handling improvements.

- UI fixes to ensure consistency in styles across Label Studio.

### Security

Made security improvements regarding org membership visibility.

### Bug fixes

- Fixed an issue where images were distorted when zooming in.

- Fixed an issue where an empty Quick View was displayed if a user tried to open a URL linking to a non-existing task ID.

- Fixed an issue where deeply nested Choices were visible even if parents were hidden.

- Fixed an issue where users were able to create bounding boxes outside the image boundaries.

- Fixed an issue that was causing intermittent loading errors in the Data Manager.

- Fixed an issue that caused incorrect video frame to be rendered when pausing.

- Fixed an infinite loading issue with the notification drawer.

- Fixed an issue where users in the Reviewer role were able to submit reviews via the API even if they were not a project member.

- Fixed an issue that would cause an API error when switching workspaces and fetching the incorrect page of projects.

- Fixed an issue where users were getting their role reset if they were provisioned via SCIM without an assigned group.

- Fixed an issue where filters were not being respected when performing bulk annotation actions.

- Fixed an issue where bulk annotation was sometimes failing with a 500 error.

- Fixed an issue with resizing Bulk Annotation drawer after having collapsed it previously.

- Fixed an issue where bulk annotation was not respecting the **Allow empty annotations** setting.

- Fixed an issue where an error was sometimes thrown when loading the workspaces list.

- Fixed an issue with the signup link styling for white labeled applications.







</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2210md"></a>

## Label Studio Enterprise 2.21.0

<div class="onprem-highlight">Bulk labeling, enable AI features, and multiple labeling and Data Manager enhancements</div>

*Feb 25, 2025*

Helm Chart version: 1.9.5


### New features

#### Bulk labeling and image preview 

There is a new **Bulk label** action available from the Data Manager. You can use this to quickly label tasks multiple tasks at once.

This feature also includes enhancements to the Grid View in the Data Manager. Now when viewing images, you can zoom in/out, scroll, and pan.

For more information, see the [Bulk labeling documentation](labeling_bulk) and [Bulk Labeling: How to Classify in Batches](https://humansignal.com/blog/bulk-labeling-how-to-classify-in-batches/).

![Screenshot of bulk label action](/images/releases/2-21-bulk-label.png)

![Screenshot of Grid View preview](/images/releases/2-21-data-preview.png)

#### Enable AI features

There is a new toggle on the **Billing & Usage** page (only available to users in the Owner role). You can use this to enable [AI features](ask_ai) throughout Label Studio. 

![Screenshot of enable AI](/images/releases/2-21-ai-enable.png)

![Screenshot of AI banner](/images/releases/2-21-ai.png)


### Enhancements

#### Updated Billing & Usage page

The **Billing & Usage** page (only accessible to users in the Owner role) has several new options:

- **Early Adopter** - Opt in to new features before they're generally available.
- **Enable AI Features** - Enables AI helper tools within Label Studio. See [AI features](ask_ai).
- **White labeling** - Contact sales about enabling white labeling.
- **Custom Scripts** - Contact sales to enable custom scripts. See [Custom scripts for projects](scripts).

#### Updated template images

The thumbnail images for the pre-built templates have been redesigned.

![Screenshot of template library](/images/releases/2-21-templates.png)

#### Clearer description of annotation count

The annotation counter at the bottom of the Data Manager has been updated to read "Submitted Annotations." It previously read "Annotations," which could cause confusion.

![Screenshot of counter](/images/releases/2-21-count.png)

#### Display the prediction score in the labeling interface

When you have annotations generated by predictions (pre-annotations), you will now see the prediction score (also known as the "confidence score") under the model name in the labeling interface tabs.

![Screenshot of scores](/images/releases/2-21-score.png)

#### Region number in Relations panel

The **Relations** panel now displays the number identifier for the region when viewing relations between regions.

![Screenshot of region IDs](/images/releases/2-21-regions.png)

#### Export images with YOLO, YOLO_OBB, and COCO

Previously, when exporting data in YOLO, YOLO_OBB, or COCO format, the images themselves were not included in the export. 

To improve this, we have introduced three new choices to the export options:

* **YOLO_WITH_IMAGES**

* **YOLO_OBB_WITH_IMAGES**

* **COCO_WITH_IMAGES**

#### Set ground truths by user

There is a new action from the Data Manager that allows you to mark the annotations submitted by a specific user as ground truth annotations.  

![Screenshot of ground truths](/images/releases/2-21-gt.png)

![Screenshot of ground truths](/images/releases/2-21-gt2.png)

#### Control login redirects

There is a new `LOGIN_PAGE_URL` variable will redirect the login page to the URL specified in the variable. This is useful for organizations with that have white labeling enabled and/or multiple internal groups that have different IdP provider logins (or no IdP provider login).   

#### Performance improvements

Various performance improvements around Members page load time, annotation creation, and memory usage for Image tags. 

### Security

- Updated Iodash to address security vulnerabilities.

- Ensured that file paths remain hidden when import operations fail.

### Bug fixes

- Fixed an issue where the Annotator Performance drop-down was not filtering the results as expected.

- Fixed an issue where users were unable to select and move bounding box regions after adding brush regions.

- Fixed an issue where seeking within a video would display duplicate frames in the the Video tag.

- Fixed an issue when managers could review skipped tasks in Quick View.

- Fixed an issue where project to groups mapping was not working correctly for SAML.

- Fixed an issue that caused would sometimes cause project creation to fail when pasting code into the code editor.

- Fixed an issue where Sentry would still attempt to load assets even if disabled.

### Feature flag updates

The following feature flags have been marked stale or deleted, meaning they can no longer be turned on or off by users:

`fflag_feat_front_optic_767_annotator_project_multiselect_short`  
`fflag_fix_back_leap_612_explore_review_09042024_short`  
`fflag_fix_optic_214_extra_blank_dashboard_charts_short`  
`fflag_fix_optic_391_tasks_outside_low_agreement_project_counts_short`  
`fflag_fix_all_leap_877_annotator_membership_api_03042024_short`  
`fflag_feat_all_optic_520_annotator_report_short`  
`feat_all_optic_71_dashboard_multiple_labeling_group_support_v1_01092023_short`  
`fflag_feat_front_prod_281_project_list_search_19072023_short`  
`fflag_feat_all_lsdv_e_295_project_level_roles_via_saml_scim_ldap_short`  
`ff_back_2884_comments_notifications_02092022_short`  
`ff_back_DEV_1711_review_queue_140222_short`  
`ff_front_dev_1480_created_on_in_review_180122_short`  
`fflag_fix_front_leap_32_zoom_perf_190923_short`  
`fflag_feat_front_lsdv_5452_taxonomy_labeling_110823_short`  
`fflag_fix_front_dev_3793_relative_coords_short`  
`ff_front_dev_2715_audio_3_280722_short`  
`fflag_feat_front_optic_1351_use_new_projects_counts_api_short`  
`fflag_feature_all_optic_1421_cold_start_v2`  
`fflag_fix_back_optic_1407_optimize_tasks_api_pagination_counts`  
`fflag_fix_optic_1259_lse_projects_read_apis_use_replica_short`  
`fflag_feat_all_optic_1181_membership_performance`  
`fflag_feat_optic_1025_zendesk_widget_integration`  
`fflag_feat_all_optic_991_dashboard_v2_short`  
`fflag_feat_optic_378_limit_projects_per_page_to_ten_short`  
`fflag_feat_optic_67_drag_and_drop_charts`  




</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2201md"></a>

## Label Studio Enterprise 2.20.1

<div class="onprem-highlight">Security-related fixes</div>

*Feb 12, 2025*

Helm Chart version: 1.9.2

### Security

- Image file paths are restricted as to prevent arbitrary path traversal. 
- As an XSS prevention measure, `/projects/upload-example` no longer accepts GET requests.
- Only recognized S3 endpoints from a list of known S3 API providers will return full list exceptions when an HTTP call is submitted.

!!! note
    If you want to use a non-standard/custom domain for hosting your S3 API and you still want full exceptions to be visible, you can add your domain to the `S3_TRUSTED_STORAGE_DOMAINS` environment variable.

    Separate multiple domains with a comma. For example, if the endpoints you are using are `https://foo.mys3endpoint.net` and `https://myothers3endpoint.biz`, then you would set it as: 
    
    `S3_TRUSTED_STORAGE_DOMAINS=mys3endpoint.net,myothers3endpoint.biz`





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2200md"></a>

## Label Studio Enterprise 2.20.0

<div class="onprem-highlight">Taxonomy for labeling, new audio hotkey, performance improvements, bug fixes </div>

*Jan 28, 2025*

Helm Chart version: 1.9.0

### Enhancements

#### Use Taxonomy for labeling

There is a new `labeling` parameter available for the Taxonomy tag. When set to true, you can apply your Taxonomy classes to different regions in text. For more information, see [Taxonomy as a labeling tool](/templates/taxonomy).

![Screenshot of taxonomy as labeling tool](/images/releases/2-20-taxonomy.png)

#### Hotkeys for audio labeling

There is a new hotkey available for pausing and starting audio: `ctrl`+`p` (Windows) or `command`+`p` (Mac). This is in addition to the space hotkey that performs the same function. However, this new hotkey is useful when you are working with audio and have a text area field in focus.

#### Video frame classification template

The video frame classification template is now available in the Label Studio app as well as [the documentation](/templates/video_frame_classification).


#### Performance improvements

Optimized the API calls made from the frontend within the members management and Data Manager users lists. Also optimized the Projects page for faster load times. 

### Security

- Upgraded pyarrow to address vulnerabilities in older packages.

- Updated the default settings for CSRF cookie to be more secure and added an environment setting to control cookie age.

### Breaking changes

This release includes an upgrade to Django 5. As part of this change, Label Studio now requires PostgreSQL version 13+. 

### Bug fixes

- Fixed an issue where the Label Studio version as displayed in the side menu was not formatted properly.
  
- Fixed an issue where the `contextlog` was not reporting the `content_type`.

- Fixed an issue with overlapping relations on the overlay on highlighting.

- Fixed an issue where task IDs were being duplicated when importing a large number of tasks through the API.

- Fixed an issue where users were not being redirected to the appropriate page after logging in.

- Fixed an issue where users were unable to edit meta information that they previously added to bounding box regions.

- Fixed multiple issues resulting from Poetry/Poetry core 2 release.

- Fixed an issue where the django-rq admin page was unavailable.

- Fixed a possible race condition when dynamically loading the Data Manager or editor that would prevent either from loading.

- Fixed an issue where skipped tasks were not being calculated as completed when the project Skip Queue setting was set to **Ignore Skipped**.







</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2191md"></a>

## Label Studio Enterprise 2.19.1

<div class="onprem-highlight">Bug fixes </div>

*Jan 02, 2025*

Helm Chart version: 1.7.4

### Bug fixes
- Fixed an issue where, in some cases, project roles were reset on SAML SSO login. 
- Fixed an issue affecting Redis credentials with special characters. 






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2190md"></a>

## Label Studio Enterprise 2.19.0

<div class="onprem-highlight">Paginated multi-image labeling and a new Task Reservation setting </div>

*Dec 17, 2024*

Helm Chart version: 1.7.3

### New features

#### Paginated multi-image labeling

Paginated multi-image labeling allows you to label an album of images within a single task. When enabled, a page navigation tool is available within the labeling interface. 

While you can use paginated multi-image labeling with any series of related images, it can also be especially useful for for document annotation. 

For example, you can pre-process a PDF to convert it into image files, and then use the pagination toolbar to navigate the PDF. For more information, see our [Multi-Page Document Annotation template](/templates/multi-page-document-annotation).

To enable this feature, use the `valueList` parameter on the [`<Image> tag`](/tags/image).

![Screenshot of multi-page annotation](/images/releases/2-19-mig.png)

#### Set task reservation time

There is a new project setting under **Annotation > Task Reservation**.

You can use this setting to determine how many minutes a task can be reserved by a user. You can also use it for projects that have become stalled due to too many reserved tasks. For more information, see [Project settings - Task Reservation](https://docs.humansignal.com/guide/project_settings_lse#lock-tasks).

By default, the task reservation time is set to one day (1440 minutes). This setting is only available when task distribution is set to **Auto**.

![Screenshot of multi-page annotation](/images/releases/2-19-reservation.png)

### Enhancements

- When using the **Send Test Request** action for a connected ML backend model, you will now see more descriptive error messages.

- The placeholder text within labeling configuration previews is now more descriptive of what should appear, rather than providing example text strings.

- Improved the inter-annotator agreement API so that it is more performant and can better handle a high number of annotators.

- Improved Annotator Performance Report page load time.

- TextArea elements have been updated to reflect the look and feel of other labeling elements.

### Bug fixes

- Fixed an issue where SSO/SAML users were not being redirected back to the originally requested URL.

- Fixed an issue where a timeout on the inter-annotator agreement API would cause missing data in the Annotator Summary table on the Members page.

- Fixed an issue where the default date format used when exporting to CSV was incompatible with Google Sheets.

- Fixed an issue where commas in comment text breaking were causing errors when exporting to CSV from the Annotator Performance report.

- Fixed an issue that was causing 404 errors in the Activity Log.

- Fixed an issue where users were unable to deselect tools from the toolbar by clicking them a second time.

- Fixed an issue where users were presented with Reviewer actions even if the annotation was still in Draft state.

- Fixed an issue with the Source Storage editor in which some fields were overlapping in the user interface.

- Fixed an issue with the Data Manager filters when the columns are different from those in the labeling config and when `$undefined$` is present in the task data.

- Fixed an issue where filter options in the Data Manager would disappear on hover.

- Fixed an issue which caused XML comments to incorrectly be considered in the label config validation.

- Fixed an issue causing an error when marking a comment as read.

- Fixed an issue where an error message would appear when selecting or unselecting the **Get the latest news & tips from Heidi** option on the Account Settings page.

- Fixed an issue where annotators were seeing a tooltip message stating that the project was not ready yet, even though the project had already been completed.

- Fixed an issue where project-level roles did not affect role upgrades performed at the Organization level.


### Feature flag updates

The following feature flags have been removed:

- `fflag_feat_front_dev_2984_dm_draggable_columns_short`
- `fflag-feat-front-dev-2982-label-weights-settings`
- `ff_back_2070_inner_id_12052022_short`







</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2180md"></a>

## Label Studio Enterprise 2.18.0

<div class="onprem-highlight">Link comments to fields, export information from the Annotator Performance dashboard </div>

*Nov 19, 2024*

Helm Chart version: 1.7.1

### New features

#### Link comments to fields

You can now link comments to specific regions or fields within an annotation.

This change will help improve clarity between Annotators and Reviewers, enhancing the quality review process.

For more information, see [Comments and notifications](https://docs.humansignal.com/guide/comments_notifications).

![Screenshot of comment linking](/images/releases/2-18-comments1.png)

![Screenshot of comment linking](/images/releases/2-18-comments2.png)

#### Export information from the Annotator Performance dashboard

There is a new **Export** action available from the [Annotator Performance dashboard.](https://docs.humansignal.com/guide/dashboard_annotator)

- **Report** - Download the information in the dashboard as CSV or JSON.
- **Timeline** - Download a detailed timeline of all the user's annotation actions within the timeframe, including when the began and submitted each annotation.
- **Comments Received** - Download a CSV file with all of the comments that other users have left on the user's annotations.

![Screenshot of export action](/images/releases/2-18-export.png)

### Enhancements

#### Performance score added to the Annotator Performance dashboard

A **Performance Score** metric has been added to the Annotator Performance dashboard metrics. This reflects the overall performance of annotators in terms of review actions (**Accept**, **Reject**, **Fix+Accept**). For more information, see [Performance summaries](https://docs.humansignal.com/guide/dashboard_annotator#Performance-summaries). 

![Screenshot of Performance Score metric](/images/releases/2-18-score.png)

#### Edit regions when classifying video frames

We recently introduced the ability to perform [video frame classification](https://docs.humansignal.com/templates/video_frame_classification) with the `<TimelineLabels>` tag.

You now have the ability to edit the frame spans you select in the timeline editor, making it easier to control which frames you want to label.

![Screenshot of edit action](/images/releases/2-18-edit.png)

#### Improved usability on project settings pages

There are a number of [project settings](https://docs.humansignal.com/guide/project_settings_lse) that are only applicable when auto distribution is enabled for users.

To prevent confusion, settings that are not applicable will be hidden when manual distribution is enabled.

This means the following settings will be hidden when **Annotation > Distribute Labeling Tasks** is set to **Manual**:

- **Annotation > Task Sampling**
- **Quality > Overlap of Annotations**
- **Quality > Low Agreement Strategy**

#### Hotkey to show/hide all regions

A new hotkey (**Ctrl + h**) has been added. Use this shortcut to hide all regions. Or, if no regions are visible, show all regions.

### Bug fixes

- Fixed an issue where users were shown a 500 error when attempting to create a project without first selecting a workspace.

- Fixed an issue where in certain scenarios users were unable to receive a password reset email.

- Fixed an issue where non-unicode symbols would cause the Activity Log page to not load.

- Fixed an issue where, despite the project settings, reviewers were not required to leave a comment on reject if they were using Quick View.

- Fixed an issue where links were not resolving when using multiple S3 storages.

- Fixed an issue where users were unable to use multiple source storages.

- Fixed a small UI issue seen when displaying drop-down menus with multiple nested selection options.

- Fixed an issue where deleting reviews did not clear cancelled values from the Data Manager.

- Fixed an issue where the **Allow reviewer to choose: Requeue or Remove** setting could cause the Label All Tasks action to be enabled for annotators when there were no tasks to label.

- Fixed an issue where instructions were not visible to reviewers in the Review Stream.

- Fixed an issue in which SMTP configuration was not working correctly despite passing initial tests.

- Fixed an issue where deleted annotator users were not available as option when building filters in the Data Manager.

- Fixed an issue that could produce duplicate accounts when synced from SCIM.

- Fixed an issue where the application would crash when annotators who have also had a project role of Reviewer would navigate to the Data Manager.

- Fixed an issue where users were getting errors if using Redis passwords that included special characters.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2170md"></a>

## Label Studio Enterprise 2.17.0

<div class="onprem-highlight">New reviewer workflow options, streamlined layout for the Projects page, and other UI improvements </div>

*Oct 22, 2024*

Helm Chart version: 1.6.3

### New features

#### Allow Reviewers to either requeue or reject annotations

There is a new option on the **Review** page of the project settings: **Allow reviewer to choose: Requeue or Remove**.

When enabled, reviewers will see two reject options for an annotation: **Remove** (reject and remove the annotation from the queue) and **Requeue** (reject and then requeue the annotation).

This is useful for situations in which some annotations are incorrect or incomplete, but are acceptable with some fixes. In those cases, it may be more useful to send the task back to the annotator. In other cases, where the annotation is far from correct, it is better to remove it entirely. 

For more information, see [Project settings - Review](#Review).

![Screenshot of reject setting options](/images/releases/2_17_0_review_settings.png)

![Screenshot of reject actions](/images/releases/2_17_0_review_actions.png)

### Enhancements

- The Projects page header has been updated with a more compact design:
    - The search bar, projects drop-down menu, and create actions have all been consolidated onto one line.
    - The **Use Template** action has been moved and is now available as a drop-down option within the **Create Project** button.
    - The **Use Template** action has also been renamed **Create from saved template**.

   ![Screenshot of project page](/images/releases/2_17_0_project_page.png) 
- For better clarity, the Sandbox workspace has been renamed **Personal Sandbox**.
- You will now see a progress bar when performing searches against the activity log to indicate that the search is still processing.
- When creating regions that have start and end times (such as when annotating sections of an audio track), you will now see the duration of your selection under the **Info** tab.
    ![Screenshot of duration info](/images/releases/2_17_0_duration.png)

### Bug fixes

- Fixed an issue in which the agreement score was not updating after a reviewer completed the **Fix+Accept** action.
- Fixed an issue that caused the time portion of the DateTimePicker in the project Dashboard to not display correctly.
- Fixed an issue which caused the Label Config UI preview to display stale information. 
- Fixed an issue in which users were not able to use Quick View to load tasks that included an external taxonomy.
- Fixed an issue where the instructions modal was not appearing for reviewers even though **Show before reviewing** was enabled in the project settings.
- Fixed an issue in which draft lead time could incorrectly inflate the lead time calculation for an annotation.
- Fixed an issue in which Data Manager drop-down menus were inaccessible in smaller viewports.
- Fixed a small UI issue seen when displaying drop-down menus with multiple nested selection options.
- Fixed an issue where images were improperly spaced in the Annotator Agreement Matrix.
- Fixed an issue in which **Label All Tasks** would not respect filters that had been applied in the Data Manager.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2160md"></a>

## Label Studio Enterprise 2.16.0

<div class="onprem-highlight">Video frame classification, user activation through SCIM, and bug fixes </div>

*Sep 24, 2024*

Helm Chart version: 1.6.3


### New features

#### Video frame classification

You can now apply labels to video frames. Previously, we only supported per-video classification. This new feature allows you to apply labels at a per-frame level. 

You can implement this feature using a new tag: [`<TimelineLabels>`](/tags/timelinelabels). 

For more information, see [New! Video Frame Classification](https://humansignal.com/blog/video-frame-classification/).

![Video frame classification](/images/releases/2_16_video.png)


### Enhancements

- You can now deactivate and activate user accounts via SCIM. Note that for this to work, `manual_role_management` must be set to `False`.  

- Changed the default behavior of the project Dashboard so that it no longer defaults to the “include time” option in the calendar.

### Bug fixes

- Fixed an issue where user limits were not being enforced when users were added via LDAP.

- Fixed a regression issue with BigInteger support in the Data Manager.

- Fixed a styling issue in which buttons were overlapping in the review workflow.

- Fixed an issue with the Activity Logs page where some options would become unavailable.

- Fixed an issue where setting a task agreement threshold incorrectly affected counts in the project Dashboard.

- Fixed an issue in which notifications were fetched too frequently.

- Fixed an issue with a missing `db` field for Redis storage, which caused issues for users adding Redis target storage.

- Fixed an issue in which project-level roles could not be reverted once set.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2150md"></a>

## Label Studio Enterprise 2.15.0

<div class="onprem-highlight">Reviewer workflow updates, drag-and-drop tab reordering, usability enhancements for the <b>Show region labels</b> option, and upgrading to Django 4.2 </div>

*Sep 03, 2024*

Helm Chart version: 1.6.3

### Enhancements

- The reviewer workflow has changed to be more user-friendly and intuitive. As part of this enhancement, you will see the following changes:
    - If you are a Reviewer, Manager, Admin, or Owner and you click a task in the Data Manager, you will now see the reviewer actions (**Accept, Reject, Fix+Accept**) instead of the **Update** action. Going forward, only the user who created the annotation will see the **Update** action.
    - The **Explore All Reviews** option is no longer available. This is because the same basic functionality is now available by simply selecting tasks in the Data Manager.
    - When you click **Review All Tasks**, by default you will now be shown tasks in the same order in which the annotator completed their tasks. Previously, you were shown tasks in reverse order from completion.

   For more information, see [Improvements to HumanSignal Reviewer Workflow](https://humansignal.com/blog/improvements-to-humansignal-reviewer-workflow/). 

* You can now reorder tabs in the Data Manager by dragging and dropping them.

    ![Gif of reordering tabs](/images/releases/2-15-drag-and-drop.gif)

* When viewing regions with the **Show region labels** option enabled, the region label will now include the same index identifier that you see in the regions list. 

    Before:

    ![Screenshot of label regions before](/images/releases/2-15-label-after.png)

    After:

    ![Screenshot of label regions after](/images/releases/2-15-label-before.png)

* When you make changes to the labeling configuration and attempt to navigate away before leaving, you will now see a warning message prompting you to save your changes. 

    ![Screenshot of warning message](/images/releases/2-15-unsaved-changes.png)

* When using the Annotator Performance Reports, you can now select whether you want to aggregate data by Creation Date or Updated Date. 

    ![Screenshot of warning message](/images/releases/2-15-performance-report.png)

* There is a new Performance Score column on the project Members page:

    The Performance Score column reflects the overall performance of annotators. This score takes into account all review actions, including annotations that were initially rejected and later accepted. The calculation is as follows:
    - Each annotation review action (accept, reject, fix+accept) contributes to the score.
    - The score is calculated by summing the scores of all review actions and dividing by the total number of review actions.
    For example:
    - If an annotation is rejected twice and then accepted once, the Performance Score would be (0 + 0 + 1) / 3 = 33%.
    - If an annotation is rejected once and then fixed+accepted with a score of 42%, the Performance Score would be (0 + 0.42) / 2 = 21%.

    This is different from the Review Score, which only reflects the current accepted/rejected state of annotations.

    ![Screenshot of performance score](/images/releases/2-15-performance-score.png)

* There is now a link to the HumanSignal support portal available from the menu. You can find FAQ and troubleshooting information here, as well as a link to open a support ticket.  

    ![Screenshot of warning message](/images/releases/2-15-support-link.png)

### Breaking changes

- This release includes an upgrade to Django 4.2. As a result, PostgreSQL 11 is no longer support. Before upgrading, you must migrate to PostresSQL 12 or later.

### Security

Upgraded NLTK to 3.9.1 to address [CVE-2024-39705](https://nvd.nist.gov/vuln/detail/CVE-2024-39705). 

### Feature flag updates

The following feature flags have been removed:

- `fflag_feat_front_prod_e_111_annotator_workflow_control_short`
- `fflag_fix_front_lsdv_4673_rect3point_relative_310523_short`
- `ff_back_1614_rejected_queue_17022022_short`

### Bug fixes

- Fixed an issue where the View all annotations action was not working when the `<Text>` tag value was empty.

- Fixed an issue where Annotators were not seeing comments when assigned to the Reviewer role on the project-level.

- Fixed an issue with agreement scores for Annotators being inaccurately calculated on the Members page within projects. This issue would appear when a Reviewer would reject an annotation and then later accept it.

- Fixed an issue with displaying large integer numbers in the Data Manager.

- Fixed an issue with breaking Text/HyperText content that contains emoji when regions are added.

- Fixed an issue with tooltips that was causing errors in the transition effects.

- Fixed an issue where workspaces could be deleted through the API even if they still contained projects.

- Fixed an issue where users were seeing an error when visiting the Annotator Performance Report page without first selecting a user. Instead, users should be redirected away from the page until a user is selected.

- Fixed usability issues seen in the Members table once the member user list grows large enough.

- Fixed an issue where users were seeing a runtime error when loading the dashboard in situations in which the project’s labeling configuration did not include labels.

- Fixed an issue where tracing was breaking presigned URL requests.

- Fixed an issue where the Project dashboard was returning an error.

- Fixed an issue where, when attempting to select multiple bounding boxes by pressing Command (or Ctrl), a new bounding box would be created instead.

- Fixed an issue where the project summary was not being included when duplicating a project.

- Fixed an issue where images were improperly resizing after loading due to how the original dimensions were set.





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2140post1md"></a>

## Label Studio Enterprise 2.14.0.post1

<div class="onprem-highlight">Bug fix</div>

*Aug 27, 2024*

Helm Chart version: 1.6.3

### Bug fixes
- Fixed an issue that occurred with Chrome v128 where the Data Manager would not display correctly.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2140md"></a>

## Label Studio Enterprise 2.14.0

<div class="onprem-highlight">Refreshed interface for the HumanSignal platform and bug fixes</div>

*Jul 30, 2024*

Helm Chart version: 1.6.0

### New features

#### Refreshed Label Studio interface

This release includes a new UI with updated colors and fonts, giving it a sleek new look while maintaining the same intuitive navigation you're familiar with. All Label Studio tools, features, and settings are still in the same place, ensuring a smooth transition.

![Screenshot of new UI](/images/releases/2-14-UI-login.png)

![Screenshot of new UI](/images/releases/2-14-UI-new.png)

![Screenshot of new UI](/images/releases/2-14-UI-projects.png)

![Screenshot of new UI](/images/releases/2-14-UI-settings.png)

![Screenshot of new UI](/images/releases/2-14-UI-settings2.png)

### Bug fixes

- Fixed an issue where users were unable to export in Pascal VOC XML format when applying bounding boxes to images.

- Fixed an issue where after an annotation had been fixed and accepted, the update action was not recorded when exporting the annotation history to JSON.

- Fixed a sizing issue affecting the icons for workspace actions.

- Fixed an issue where the docs link icon was not properly formatted.

- Fixed an issue affecting SAML users caused by changes to the HumanSignal app domain.

- Fixed an issue in which sometimes the Submit button would be displayed when it should be the Update button.

- Fixed an issue where Annotators where able to resolve comments made by Reviewers, when this action should not be available to them.

- Fixed an issue where usernames in the Annotator Performance Report were not displayed correctly if the user had a long email address.

- Fixed an issue where annotation history was not working correctly if `created_by` was null.






</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2130post1md"></a>

## Label Studio Enterprise 2.13.0.post1

<div class="onprem-highlight">Bug fix</div>

*Aug 27, 2024*

Helm Chart version: 1.6.3

### Bug fixes
- Fixed an issue that occurred with Chrome v128 where the Data Manager would not display correctly.





</div><div class="release-note"><button class="release-note-toggle"></button>
<a name="2130md"></a>

## Label Studio Enterprise 2.13.0

<div class="onprem-highlight">Annotator performance dashboards, potential breaking change for Google Cloud Storage users, feature flag changes</div>

*Jul 02, 2024*

Helm Chart version: 1.4.9

### New features

#### Annotator performance dashboards - Beta

With this release, you will see a new **Performance report** action available from the Organization page. 

![Screenshot of Performance Report button](/images/project/user_report.png)

Clicking this takes you to a dashboard focused on annotator performance. This new dashboard is designed to help you manage your team, figure out resource allocation, and save the expense of building custom internal tracking tools.

![Screenshot of the annotator dashboard](/images/releases/2-13-annotator-report.png)

The annotator performance dashboard provides insight into each user’s annotation activity over a period of time. You can see how much time they spent annotating, how many annotations they submitted, and their average time spent per annotation. You can further refine this dashboard by workspace and project. 

For more information, see [Annotator performance dashboard](dashboard_annotator) and [Annotator Dashboard Helps Optimize Team Performance](https://humansignal.com/blog/new-annotator-dashboard-helps-optimize-team-performance/).

### Enhancements

Improved performance on the Projects list page due to improvement on the API level.


### Breaking changes

- Fixed an issue with Google Cloud Storage when the connection has the **Use pre-signed URLs** option disabled. In these situations, Google was sending pre-signed URLs with the format `https://storage.googleapis.com` rather than sending BLOBs.

    With this fix, Google Cloud Storage will begin returning BLOBs/base64 encoded data when **Use pre-signed URLs** is off. This means that Label Studio will start reading data from Google Cloud Storage buckets, which can result in large amounts of data being sent to your Label Studio instance - potentially affecting performance.

### Feature flag changes

- As part of an ongoing effort to streamline our codebase, we have identified a number of seldom-used feature flags. We have marked these feature flags as `stale`, meaning they can no longer be enabled by users. For a full list of all affected feature flags, see https://github.com/HumanSignal/label-studio/pull/5971

### Bug fixes

- Fixed an issue with Redis being unable to connect to SSL.
- Fixed an issue where Redis storage connections were causing errors due to a missing field in the storage form (Storage Title).
- Fixed an issue where connected ML backends were unable to return more than one prediction per task.
- Fixed an issue where annotators were not being prompted to leave a comment when skipping a task, even though the project settings required them to do so.
- Fixed an issue where sometimes actual usernames were being replaced by a generic “Admin” username in the annotation history.






</div><div class="release-note"><button class="release-note-toggle"></button>
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