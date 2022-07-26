---
title: Release notes for Label Studio Enterprise
short: Release notes
badge: <i class='ent'/></i>
type: guide
order: 120
meta_title: Release notes for Label Studio Enterprise
meta_description: Discover what's new and improved, and review bug fixes, in the release notes and changelog for Label Studio Enterprise.
---

!!! info 
    <i class='ent'></i> 
    The release notes for Label Studio Community Edition is available on the <a href="https://github.com/heartexlabs/label-studio/releases"> Label Studio GitHub repository</a>.


## Label Studio Enterprise 2.3

This section highlights the new features, enhancements, bug fixes, and security fixes in Label Studio Enterprise 2.3.

### New features and enhancements 

Label Studio Enterprise 2.3 introduces the following new features and enhancements.

- Streamline your project creation workflow by duplicating projects: Enable users to [duplicate projects](manage_users.html#More-menu-to-Pin-or-Unpin-and-Duplicate-projects) to a target workspace optionally importing the settings, tasks, and annotations. This feature allows administrators and managers to quickly spin up new projects and ensure consistency by duplicating existing projects in their workspace. You can choose to duplicate a project by settings only, both settings and data, or settings, data and all annotations. If choosing the latter, users can also decide whether to make annotations **Ground Truth**. To duplicate a project, navigate to project's **Settings** >> **More** menu, choose a destination for the new project, decide which attributes you would like to duplicate, and update the new project name and description [DEV-1202].
- Pin and create shared view of relevant projects in your workspace: Allow users to [pin or unpin projects](manage_users.html#More-menu-to-Pin-or-Unpin-and-Duplicate-projects) to more easily filter and find projects of interest. This feature allows you to pin and create a shared view of relevant projects in your workspace. Administrators now have the ability to pin and unpin projects for quicker reference by team members, whether they are projects the team is currently working on, or projects of interest. All team members will have a view of pinned projects to collaborate on in their workspace [DEV-2069].
- Zoom, align, and pixelate images for annotation: Annotators can zoom and expand images they are labeling within the viewport of the task, set the image to be positioned vertically (top, center, bottom) and horizontally (left, center, right) to find the most convenient position. Once an image is zoomed in, they can also choose to pixelate the image if it is blurry for more precise annotations [DEV-2504].
- Add the ability to sustain the collapse state of the label across tasks. This release provides consistent ordering of the label groups [DEV-2755], [DEV-2755].
- Enforce the change in the rotate anchor of bounding boxes around image boundaries [DEV-2671].
- Allow annotators and reviewers to filter view of transcriptions by **author name** [DEV-2669].
- This release improves the polygon point removal when you create a new polygon. In addition to the double-click and alt-click, now you can use the undo hotkeys (`ctrl/cmd+z`) to remove the point you set or redo it by clicking the `ctrl/cmd+shift+z` hotkeys [DEV-2576].

### Bug fixes

Label Studio 2.3 includes the following bug fixes:

- Fixed an issue when the text captured by a region was not displayed in the **Details** panel [DEV-2958].
- Resized the left panels in **Quick View** mode to work consistently when expanded to the right in **Label** or **Review** stream, and stop after the maximum width was reached [DEV-2952], [DEV-2943].
- Fixed an issue in the **Label** stream, where the region was displayed in the proper position [DEV-2934].
- Fixed user's inability to hide regions within the **NER** scenario [DEV-2931]. 
- The user resized a panel in such a way that it obscured all the underlying content [DEV-2926].
- Fixed an issue when the selection was still active after hiding an **Image** region [DEV-2922].
- Fixed an issue when the selection was broken after showing previously hidden selected region [DEV-2922].
- Changed the model version selector API response handling and current upgrade error for out-of-date machine learning backend [DEV-2905].
- **Skipped tasks** were placed at the beginning of the **Label** stream [DEV-2880]. 
- Improved project duplication speed [DEV-2869].
- One API request was not loaded on the **Load project list** [DEV-2811].
- Fixed an issue where assigned reviewers got tasks from auto-queue instead of assigned tasks [DEV-2779].
- Fixed the text display in the **Taxonomy choices** when long titles were used [DEV-2707].
- Displayed source filename for tasks from storage in a separate column [DEV-2687].
- [DEV-2639].
- Fixed the behavior of the drop-down menu that failed to group when the organization was not activated [DEV-2639].
- Updated annotation failed to display in the **Review Annotations** stream [DEV-2533].
- Fixed an issue where **Quick View** failed to open when the user attempted to copy-paste its URL to another tab [DEV-2526].
- Unfinished polygon region failed to auto-completed when the user moved it [DEV-2514].
- Multiple labels failed to show within **Regions** [DEV-2503].
- Unfinished polygons were saved as a draft and remained in an open state if left unclosed [DEV-2432].
- Fixed broken default page number for non-admin accounts on **Projects** page [DEV-2335].
- Fixed **Tasks per page** field to synchronize with the number of tasks displayed [DEV-2170].
- **Members** page failed to display and did not work properly [DEV-2148].
- The user cannot edit **VideoRectangle** when it was locked [DEV-2146].
- In the **Datetime:** field, only the year data was not saved [DEV-1179].
- Fixed UX and behavior when expanding or collapsing the panels and unsnapping or snapping to the sides [DEV-2851].

### Security fixes

Label Studio 2.3 includes the following security fixes:

- Fixed the vulnerability issue 
    - With JSON Web Token implementation in Python (PyJWT) [DEV-2793].
    - Against blind server-side request forgery (SSRF) on data import [DEV-2234].


## Label Studio Enterprise 2.2

This section highlights the new features and enhancements in Label Studio Enterprise 2.2.

### New features and enhancements 

Label Studio Enterprise 2.2 introduces the following new features and enhancements.

- Label Studio Enterprise 2.2 introduces the System for Cross-domain Identity Management (SCIM) version 2.0 standard. System for Cross-domain Identity Management (SCIM) is a popular protocol to manage access for services and applications across an organization. Use the [SCIM guide](scim_setup.html) to set up SCIM integration to manage access to Label Studio Enterprise in your organization.


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


## Label Studio Enterprise 2.2.10 

This section highlights the bug fixes in Label Studio Enterprise 2.2.10.

### Bug fixes

Label Studio 2.2.10 includes the following bug fixes:

#### Backend 
- Per label score for `Choices` was calculated when `no Choice` was selected [DEV-2688].
- Fixed an error for actions with ordering by **joined** field [DEV-2658].
- Fixed auto-generated docs for `api/tasks` [DEV-2737].

#### Frontend
- Fixed an issue when the Safari browser stopped working [DEV-2777].
- Fixed scrollable area in **Review** mode [DEV-2348].


## Label Studio Enterprise 2.2.9

This section highlights the breaking changes, new features and enhancements, and bug fixes in Label Studio Enterprise 2.2.9. 

### Breaking changes

Label Studio Enterprise 2.2.9 includes the following breaking change:

- This release decommissions MinIO as a service [DEV-2600].

### New features and enhancements 

Label Studio Enterprise 2.2.9 introduces the following new features and enhancements.

#### Backend
- This release provides proxy support for content-range HTTP responses [DEV-2496].
- Add API for project duplication [DEV-2538].

#### Frontend
- This release introduces the ability to select model version on model cards from the machine learning page >> **Settings** [DEV-1868].
- Now, you can show the comments column in the Data Manager to reviewers [DEV-2598].
 
#### Templates
- This release introduces [Dynamic Labels templates](https://labelstud.io/templates/gallery_dynamic_labels.html#main). You can now show labels dynamically as a task input, either as a prediction from the model or from a database lookup. With a broader set of options, dynamic labeling saves time and increases the consistency of labeling the objects [DEV-2636]. 

### Bug fixes

Label Studio 2.2.9 includes the following bug fixes:

#### Backend
- Optimized dashboard-members API performance for reviews [DEV-1669].
- Enabled Query optimization for Uniform Sampling in the Labeling Stream [DEV-2184].
- Fixed runtime error when duration was not extracted on `ASR_MANIFEST` export [DEV-2095].
- Fixed permissions for a manager role [DEV-2650].
- Fixed `annotation_id` was provided as float value in CSV export [DEV-2139].
- Replaced `inner_id` index with multicolumn [DEV-2667].
- Recalculate stats when control weights were updated [DEV-2083].
- Fixed empty agreement for taxonomy with extra labels [DEV-2440].
- Fixed `is_labeled` calculation after task import [DEV-2389].

#### Frontend 
- Fixed the regions that disappeared from UI in **Annotation History** [DEV-2408]. 
- Improved the **Annotation History** name/timestamp spacing [DEV-23640].
- Fixed audio crashes in **View All** mode [DEV-2199].
- Pan does not finish the polygon [DEV-2068].
- Fixed nested choices for the indeterminate state [DEV-2244].
- Fixed an issue to get text after granularity was applied in **Annotation Result** [DEV-1592].
- Zoomed image region out of bounds [DEV-2394].
- Viewed all audio responsive [DEV-2203].
- Fixed an issue where all parts of audio in the **View All** mode were equally responsive to browser size changes [DEV-2577].
- Resynchronized annotations that failed to synchronize in **Target Storage** [DEV-1781].
- Supported lengthy unbroken taxonomy line breaks [DEV-1975] and [DEV-1843].
- Retained the size for key points [DEV-2577]. 
- Display the correct number of member icons on project cards [DEV-2334].
- Fixed rendering issue on video regions [DEV-2494].
- Fixed the loading issue for `Paragraph` data on **QuickView** [DEV-2465].
- Allowed edit action on Time Series results imported as read-only [DEV-2367].
- Fixed Annotation History when exiting **View All** [DEV-2302]. 
- Added X-axis zoom threshold [DEV-1714].
- Added guard with an error message for non-incremental, non-sequential datasets in Time Series [DEV-2510].
- Disabled the delete **all region** button when an annotation is read-only [DEV-2309].
- Fixed blind Server-side Request Forgery (SSRF) on add model and import [DEV-2235].
- Deselected the ImageView bounding box before creating another [DEV-1422]. 
- Fixed data in Search Engine Results Page (SERP) ranking in-app template [DEV-2604]. 
- Unfinished polygon zoom fix [DEV-2313]. 
- Fixed flickering issue when regions were created with the Bounding box [DEV-2592].
- Video regions were edited when Annotation History was selected [DEV-2303].
- Added background as a new parameter to text shortcuts [DEV-2423].
- Fixed the form layout and allowed the model version selector when the ML backend was edited [DEV-1682].
- Text and Header tags work with integers now [DEV-2459].
- Fixed synchronization speed between video and audio [DEV-2207].
- Fixed an issue with prop `whenChoiceValue` [DEV-1833].


## Label Studio Enterprise 2.2.8

This section highlights the breaking changes, new features and enhancements, and bug fixes in Label Studio Enterprise 2.2.8. 

### New features and enhancements

Label Studio Enterprise 2.2.8 introduces the following new features and enhancements.

- This release displays comments in **Data Manager** to reviewers [DEV-2598].
- Support for [Redis Secure Sockets Layer (SSL)](security.html#Secure-access-to-Redis-storage) [DEV-1768].
- Add tags and prefixes to [AWS metric parameters](custom_metric.html#How-to-write-your-custom-agreement-metric) [DEV-1917].
- Change review API to take into account feedback loop [DEV-2198].
- Notification Center [DEV-1658]
- Add drafts in Annotation History [DEV-2290].
- Introduce new history types [DEV-2387]. 
- Support for System for Cross-domain Identity Management (SCIM 2.0) user and group provisioning [DEV-1823].
- Add the ability to pass a comment to APIs on skip [DEV-2458].

### Bugfixes

Label Studio 2.2.8 includes the following bug fixes:

- Per label score for Choices was calculated when no Choice was selected (hotfix-7) [DEV-2688].
- Fixed Rotating bounding box bugs (hotfix-4) [DEV-2647]
- Fixed permissions for manager role (hotfix-3) [DEV-2650]
- Fixed export to file using `SerializableGenerator` [DEV-2248].
- Fixed accepted state in review. [DEV-2256]
- Made Annotation History with linear Reject (Reject = Update + Reject) [DEV-2263].
- Fixed Annotation History icons [DEV-2264].
- Annotation history fixes [DEV-2265], [DEV-2268], [DEV-2271].
- Fixed an issue where the Annotation History was not loading because of string ID [DEV-2278].
- Fixed validation in Labeling Interface preview with Dynamic Labels [DEV-2249].
- Fixed history 404 on unskip in label stream [DEV-2262].
- Fixed **Annotation History** reset for predictions [DEV-2271].
- Fixed job cancellation for `_update_tasks_states` [DEV-2294].
- Fixed an issue to return `404` for `api/project/id/tasks` when the page was out of scope [DEV-2336]
- Interactive preannotations for **Paragraphs** [DEV-2253].
- Improved the speed to 180 secs for assigned tasks [DEV-2060].
- Disabled **Poly** and **Keypoints** for **Annotation History** [DEV-2283].
- Fixed tools multiplication issue [DEV-1690].
- Prevented the scroll-out **TopBar** option [DEV-2348].
- Fixed skip queue [DEV-2354].
- Allowed **Canvas** to fill all the space [DEV-930].
- Truncated long words in comments [DEV-2267].
- Added scroll to view when focus changes to `stickyList` in table component [DEV-1703].
- Used `contain` instead of `icontain` for **Annotation Result** field in the **Data manager** filters [DEV-2214].
- Fixed `is_labeled` for tasks with no assignments [DEV-1872].
- Added default settings [DEV-1577].
- Implemented `Go back to previously reviewed task` functionality for reviewing stream [DEV-1676].
- Refactored and optimized Redis Queues [DEV-2213].
- Fixed runtime error during import with no `total_annotations` and other [DEV-2374].
- Reviewed Next Task API performance optimizations [DEV-2350].
- Fixed the reset rejected status after the annotation update. [DEV-2216], [DEV-2321].
- Fixed skip **Annotation History** for the previous task in label stream [DEV-2407].
- Fixed Reviewed filter [DEV-1948].
- Fixed counters for skipped annotations [DEV-2406].
- Fixed an issue where tasks were flagged as REVIEWED by default [DEV-2438].
- Fixed an issue for skipped tasks to get the `Completed` status [DEV-2413].
- Fixed error when a user tried to delete all tasks [DEV-2456].
- Fixed filter by empty reviewers [DEV-2390].
- Fixed incorrect review card counters in the feedback loop for skipped annotations [DEV-2433].
- Moved from signal to model delete method [DEV-2410].
- Added new skip behavior for annotations that are requeued back to annotator [DEV-2617].
- Fixed **Annotation History** drafts [DEV-2290].
- Fixed regions for text span when it was out of bounding in the regions list and created horizontal scroll [DEV-2473].
- Fixed in **Manage Members** modal (on project **Members** tab, on workspace members, on **Members** settings) header with search overlaps by the main list [DEV-2473].
- Fixed `Textarea` for **Custom Function** on the **Quality** settings page [DEV-2473].
- Fixed `startOffset` for empty nodes [DEV-2480].
- Fixed the runtime error for users who deleted an annotation from **Quick View**,  switched to another task, and returned back to the same task [DEV-2306].
- Added command for all orgs and optimize `update_tasks_counters` [DEV-2492].
- After annotations from predictions `is_labeled` should be recalculated [DEV-2490].
- Fixed 404 on skip [DEV-2416].
