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


## Label Studio Enterprise 2.2.11

This section highlights the new features, enhancements, and bug fixes in Label Studio Enterprise 2.2.11. 

### New features and enhancements 

Label Studio Enterprise 2.2.11 introduces the following new features and enhancements.

- Integrate project duplication of tasks and annotations with API [DEV-2539].
- Allow annotators and reviewers to filter the view of transcriptions by author name [DEV-2669].
- Improve the load project list performance by adding two API requests [DEV-2575].
- Introduce the project duplication interface that allows you to copy projects with settings, tasks, and annotations [DEV-2702].
- Present the project pinning interface that allows you to pin projects for better visibility of commonly referenced projects [DEV-2629]. 
- Implement keyboard actions using arrow keys to navigate the Taxonomy project [DEV-2424]:
  - Up/Down key: For navigation purposes.
  - Right key: To open a subtree.
  - Space bar: To select an item. 

### Bug fixes

Label Studio 2.2.11 includes the following bug fixes:

- Allowed unfinished polygons to be saved as draft [DEV-2432].
- Retained history on initial load of annotation review stream [DEV-2437].
- Fixed workspace filter for project list API [DEV-2785].
- Displayed source filename for tasks from storage in a separate column [DEV-2687].
- Implemented **Tasks per page** field to sync with the number of tasks displayed [DEV-2170].
- Fixed an issue where changing the label for one region did not change the legend for the other regions  [DEV-2462].
- Resolved an issue where **Quick View** failed to open when the user attempted to copy-paste its URL to another tab [DEV-2526].
- Fixed the behavior of the drop-down menu that failed to group when the organization was not activated [DEV-2639].
- Implemented the pagination behavior to retain the current position or page whenever possible, at least until the user leaves the project [DEV-2153].
- Fixed an issue where the anchor of the image moved outside the frame and the user was not able to rotate the bounding box [DEV-2671].
- Prevented users from editing fields that were not editable [DEV-2365].
- Resolved an issue where the relationship **Delete** button failed to work as expected [DEV-2806].
- Ensured `review_settings` was included in the initial request [DEV-2575].
- Added a tag for `<Date>`, `<DateTime>`, or `<Year>` that was conditionally rendered [DEV-117].
- Allowed annotators and reviewers to filter the view of transcriptions by author name [DEV-2669].
- Added the ability to delete points with an Alt-click button [DEV-2431].
- Allowed users to pin or unpin projects to easily filter and find projects of interest [DEV-2069].
- Fixed `PyJWT` vulnerability for users to sign up without any error in the Sign-Up flow [DEV-2793].
- Implemented important fixes for multi-lines and interactions [DEV-2424].


## Label Studio Enterprise 2.2.10 

This section highlights the bug fixes in Label Studio Enterprise 2.2.10.

### Bug fixes

Label Studio 2.2.10 includes the following bug fixes:

- Per label score for `Choices` was calculated when `no Choice` was selected [DEV-2688].
- Fixed an error for actions with ordering by **joined** field [DEV-2658].
- Fixed auto-generated docs for `api/tasks` [DEV-2737].
- Fixed an issue when the Safari browser stopped working [DEV-2777].
- Fixed scrollable area in **Review** mode [DEV-2348].


## Label Studio Enterprise 2.2.9

This section highlights the breaking changes, new features, enhancements, and bug fixes in Label Studio Enterprise 2.2.9. 

### Breaking changes

Label Studio Enterprise 2.2.9 includes the following breaking change:

- This release decommissions MinIO as a service [DEV-2600].

### New features and enhancements 

Label Studio Enterprise 2.2.9 introduces the following new features and enhancements.

- This release provides proxy support for content-range HTTP responses [DEV-2496].
- Add API for project duplication [DEV-2538].
- This release introduces the ability to select the model version on model cards from the machine learning page >> **Settings** [DEV-1868].
- Now, you can show the comments column in the Data Manager to reviewers [DEV-2598].
- This release introduces [Dynamic Labels templates](https://labelstud.io/templates/gallery_dynamic_labels.html#main). You can now show labels dynamically as a task input, either as a prediction from the model or a database lookup. With a broader set of options, dynamic labeling saves time and increases the consistency of labeling the objects [DEV-2636]. 

### Bug fixes

Label Studio 2.2.9 includes the following bug fixes:

- Optimized dashboard-members API performance for reviews [DEV-1669].
- Enabled Query optimization for Uniform Sampling in the Labeling Stream [DEV-2184].
- Fixed runtime error when duration was not extracted on `ASR_MANIFEST` export [DEV-2095].
- Fixed permissions for a manager role [DEV-2650].
- Fixed `annotation_id` was provided as float value in CSV export [DEV-2139].
- Replaced `inner_id` index with multicolumn [DEV-2667].
- Recalculate stats when control weights were updated [DEV-2083].
- Fixed empty agreement for taxonomy with extra labels [DEV-2440].
- Fixed `is_labeled` calculation after task import [DEV-2389].
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
- Disabled to delete **all region** button when an annotation is read-only [DEV-2309].
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

This section highlights the breaking changes, new features, enhancements, and bug fixes in Label Studio Enterprise 2.2.8. 

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

### Bug fixes

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
- Fixed history `404` when the user canceled a skipped annotation in the label stream [DEV-2262].
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
- Added new skip behavior for annotations that are requeued back to the annotator [DEV-2617].
- Fixed **Annotation History** drafts [DEV-2290].
- Fixed regions for text span when it was out of bounding in the regions list and created horizontal scroll [DEV-2473].
- Fixed in **Manage Members** modal (on project **Members** tab, on workspace members, on **Members** settings) header with search overlaps by the main list [DEV-2473].
- Fixed `Textarea` for **Custom Function** on the **Quality** settings page [DEV-2473].
- Fixed `startOffset` for empty nodes [DEV-2480].
- Fixed the runtime error for users who deleted an annotation from **QuickView**,  switched to another task, and returned to the same task [DEV-2306].
- Added command for all orgs and optimize `update_tasks_counters` [DEV-2492].
- After annotations from predictions `is_labeled` should be recalculated [DEV-2490].
- Fixed `404` on skip behavior [DEV-2416].
