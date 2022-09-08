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
This section highlights the new features and enhancements in Label Studio Enterprise 2.3.

### New features and enhancements 
Label Studio Enterprise 2.3 introduces the following new features and enhancements.

- Allows annotators and reviewers to filter the view of transcriptions by author name [DEV-2669].
- Improve project list performance by hydrating counters in a second request [DEV-2575].
- Project duplication interface that allows users to copy projects with settings, tasks, and annotations [DEV-2702].
- Add support for pinned projects to the backend model and API [DEV-2651].
- Project pinning interface that allows users to pin projects for better visibility of commonly referenced projects [DEV-2629].
- Introduce duplication of tasks and annotations in project duplication API [DEV-2539].
- Navigate Taxonomy with arrow keys, Up/Down to navigate, Right to open subtree, Space to select item [DEV-2424].
- Added user notification about Storage Persistence availability [DEV-1232]
- Implement new columns for the commentary system: comment count, unresolved comment count, comment authors, and last comment date [DEV-2885].
- Starting with this release, you can preset size to zoom an image to fit within the viewport or to have it at its natural size (up to available space in the viewport). 
- Set the image to position vertically (top, center, bottom) and horizontally (left, center, right) [DEV-2504].
- Introduce comments system for communication between Annotators and Reviewers. Allows a Reviewer to mark comments as resolved. Comments feature also introduces new columns in the Data Manager to be able to filter tasks by comments inside [DEV-2894].
- Add workspace grouping for Annotators, displaying the Workspaces where they are the members [DEV-1278].
- Display drop-down with model versions for each machine learning backend [DEV-1646].
- Change in a rotated anchor that is no longer out of the bounding box and now close to all resize anchors [DEV-2671].
- Add label weights settings section in **Settings** >> **Quality** [DEV-2982].
- Add date and action filters for dashboard data [DEV-423].
- Support `PosixGroupType` for LDAP [DEV-3053].
- Add Paragraphs to `substring_matching` example [DEV-2362].
- Update the invite people modal to include invite by email [DEV-3065]
- Add **Resend** and **Revoke** invitation buttons to the **Organization** page when a user is selected [DEV-3066].
- Update the organization role drop-down visuals to show an indicator for inactive users [DEV-3091].
- This release updates welcome emails on signup verification and invites [DEV-3219].
- Add the ability to sustain the collapse state of the label across tasks [DEV-2755]. 
- Maintain consistency in the order of the label groups [DEV-2755].
- Cleanup lambda custom-metrics if it is not required [DEV-851].
- Add cron job to verify trial expiration [DEV-3138].
-  Block the entire screen as a non-closable modal window only when the trial ends [DEV-399].
- Add option to synchronize audio with paragraphs allowing playback of chunk position [DEV-2461].
- Support a custom column order with draggable columns [DEV-2984].
- This release enables a manual mode for assigning Reviewers to tasks [DEV-3078].


### Bug Fixes
Label Studio Enterprise 2.3 includes the following bug fixes:

- Unfinished polygons were saved as drafts and remained in an open state when unclosed. [DEV-2432].
- Retained history on initial load of annotation review stream [DEV-2437].
- Fixed workspace filter for project list API [DEV-2785].
- Displayed source filename for tasks from storage in a separate column [DEV-2687].
- Fixed the "Tasks per page" field that should be in sync with the number of tasks displayed. [DEV-2170].
- Changed the label for one region caused a change for the legend in another region. The user was able to select /switch between the labels efficiently. [DEV-2462].
- Avoided a crash when the user opened a task with a direct link [DEV-2526].
- Deselected the image region box with a short click [DEV-2379].
- Fixed the behavior of the drop-down menu that was not grouping when the organization was not activated [DEV-2639].
- Fixed ​​pagination to keep the current position (page) whenever possible, at least until the user leaves the project [DEV-2153].
- Changed the rotated anchor that is no longer out of the bbox and now close to all resize anchors [DEV-2671]
- Prevented users from being able to edit fields that are not meant to be editable [DEV-2365].
- Multiple rendered labels in regions [DEV-2763].
- Resolved an issue where the relationship delete button did not work as expected [DEV-2806].
- Ensured `review_settings` was included in the initial request [DEV-2575].
- Fixed the basic functionality related to `<DateTime>` tag that was conditionally rendered [DEV-117].
- Allowed annotators and reviewers to filter the view of transcriptions by author name. [DEV-2669].
- Added the ability to delete points with an alt-click. [DEV-2431].
- Allowed users to pin or unpin projects to more easily filter and find projects of interest [DEV-2069].
- Fixed `PyJWT` vulnerability [DEV-2793].
- `get_local_path` does not work for local files in ML backends and converter [DEV-2827].
-  Hold to continuously draw image view shapes worked with DEV-1442 enabled [DEV-2655].
- Skipped tasks are placed at the beginning of the label stream, however, they should go at the end [DEV-2880].
- Added agreement calculation for `Datetime` tag [DEV-2847].
- Speed up the **Members** page in case of ample annotations [DEV-2148].
- Resolved an issue where the 3-point bbox would remain usable after removing rectangles from the labeling configuration [DEV-2696].
- Resolved an issue where the imported annotation is marked as read-only, but allowed users to make changes anyway [DEV-2366].
- Fixed UX and behavior when expanding/collapsing the panels and unsnapping/snapping to the sides [DEV-2851].
- Displayed drop-down with model versions for each machine learning backend [DEV-1682].
- Updated Django to `3.2.14` [DEV-2936].
- Fixed the broken default page number for non-admin accounts on the **Projects** page [DEV-2335].
- Fixed an issue where the user won’t be able to edit VideoRectangle if it is locked [DEV-2146].
- Fixed an issue where the user can resize a panel so that it obscured all the underlying content. [DEV-2926].
- Fixed clashed text entries for multi-value TextArea [DEV-2930].
- Fixed an issue where the selection was still active after hiding an image region [DEV-2922].
- Fixed an issue where the selection was broken after showing a previously hidden selected region [DEV-2922].
- Added new columns for comment management in the Data Manager: Comment count, unresolved comment count, comment authors, and last comment date [DEV-2672].
- Prevented polygon from being duplicated when finishing drawing [DEV-2967]
- Implemented new columns for the commentary system: comment count, unresolved comment count, comment authors, and last comment date [DEV-2885].
- Locked polygons don't show the editable points anymore [DEV-2977].
- Removed validation for new data fields in label config [DEV-2939]
- Fixed the issue when grouping by empty label caused the app to crash completely [DEV-2942].
- Fixed an issue when Audio regions were misplaced due to zoom/viewport size [DEV-2934].
- Fixed an issue when panels can fall out of the viewport if the viewport's size changes. [DEV-2943].
- Recalculated overlap when changing overlap to 1 and changing enforce overlap [DEV-2420].
- Fixed the user's inability to hide regions within the NER scenario [DEV-2931].
- Added unique constraint for workspace members [DEV-3052].
- Fixed UX issue with an almost invisible text area in a region list when the region is selected [DEV-2927].
- Fixed app crash with Author Filter for Paragraphs enabled [DEV-3033].
- Fixed an issue where the text captured by a region was not displayed in the **Details** panel [DEV-2958].
- Resolved an issue affecting the tooltip of the flyout menu tooltips on small screens [DEV-3049].
- Disabled the delete button when previewing the historic item [DEV-2971].
- Showed indeterminate loading when project duplication is in progress. [DEV-2892].
- Unfinished polygon region was not auto-completed when the user moved it [DEV-2514].
- Annotation region locking should not persist [DEV-2949].
- Changed environment variable for enforcing local URL check for ML backend [DEV-3058].
- Fixed an issue with uploading data without annotation history [DEV-3104].
- Fixed a bug when the selected Annotation History item is not rendered on the canvas [DEV-2970].
- Increased external storage sync job timeout [DEV-2298].
- Label weight doesn't reset after Labels change [DEV-3090].
- Fixed an issue where the Project list had several project duplicates [DEV-3126].
- All “204 responses” was replaced with “200 with no response” [DEV-3014].
- Broken "All Projects" pagination [DEV-3125].
- Fixed an issue where the paragraph regions were not selectable within the new Outliner [DEV-3030].
- Options with 'selected=true' was displayed as selected by default [DEV-2519].
- Fixed configuration validation for Repeater tag [DEV-1462].
- Lazyload was implemented on image to improve loading performance [DEV-3077].
- Improved polygon point removal during drawing and allowed the option to remove the polygon point (set or redo using ctrl/cmd+shift+z) with the available undo hotkeys (ctrl/cmd+z) [DEV-2576].
- Fixed an issue with displaying Annotation History in LSC [DEV-2964].
- Details panel automatically updated on lock action [DEV-2978].
- Disabled error for label configuration validation with <!DOCTYPE> tag [DEV-3089].
- Showed list of new users created using API correctly [DEV-3131].
- Added the Talk to an expert modal [DEV-3129].
- Fixed a minor correction to invite/revoke button text [DEV-3189].
- Cleaned up logging, excluding potential security concerns related to sensitive data exposure [DEV-3164].
- Resolved and added an entry to the annotation history only when the zoom feature changed [DEV-3004].
- Project list card requests were using the wrong FF [DEV-3222].
- Fixed the issue when the text captured by a region was not displayed in the Details panel. [DEV-3101].
- Fixed an issue to allow users to get or set their password [DEV-3190].
- Inactive users were shown as  "Never" in the "Last Activity" column of the organization table instead of the date they were invited [DEV-3177].
- Improved revoke invite UX, so it's consistent when used from the selected user section and the revoke invite button in the drop-down in the User list [DEV-3196].
- Corrected an error where clearing the email field in Ask an expert modal would still allow a successful commit [DEV-3157].
- Added validation to avoid users importing local files using URL [DEV-3212].
- Invited modal when opened from ribbon refreshed the organization page for submitting if opened on that page [DEV-3167].
- Fixed an issue when selecting the region that caused region updates and changes to the history to record new changes [DEV-3140].
- Added updated_by to dashboard API [DEV-3232].
- Show/ Hide/ Lock / Unlock actions broke the Undo functionality for video labels [DEV-2968].
- Improved delete tasks action speed [DEV-2296].
- Fixed an issue when locking UI disappears when "trial days" is negative. [DEV-3275].
- Fixed an issue when the image shrinks in certain cases. [DEV-3061].
- The logout menu was displayed on smaller screens [DEV-3204].
- Turned off lambda prefix and tags for cloud instance [DEV-2761].
- Fixed a bug where the loader would appear when the user list is empty [DEV-3290].
- Tasks were not updated after the filter field changed in DM [DEV-3233].
- Fixed the issue when Sentry cannot properly capture frontend exceptions [DEV-3251].
- Excluded Deactivated / Not Activated users from project dashboards and member assignments lists [DEV-3134].
- Checked user limit for invites [DEV-3194].
- Deleted tasks were not working with some ordering (e.g. by annotators) [DEV-3313].
- Prevented annotating collapsed phrases in paragraphs [DEV-2918].
- Fixed tabs being randomly mixed after label stream [DEV-1947].
- Helm: Fixed support for Google project IDs with only digits in the name [DEV-3332].


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

- This release displays comments in **DM** to reviewers [DEV-2598].
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
