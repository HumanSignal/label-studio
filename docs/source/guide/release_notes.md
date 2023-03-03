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
    The release notes for Label Studio Community Edition is available on the <a href="https://github.com/heartexlabs/label-studio/releases"> Label Studio GitHub repository</a>.
    
    
## Label Studio Enterprise 2.4.0
This section highlights the new features and enhancements, and bug fixes in Label Studio Enterprise 2.4.

### New features and enhancements 
- The [Comments and Notifications](https://labelstud.io/guide/comments_notifications.html) feature allows you to discuss task issues and other problems during labeling and reviewing processes.
- The new Audio Player feature provides a new configurable UI that improves the audio labeling efficiency and usability [DEV-2715].
- Add `updated_at` field to comments API [DEV-3715].
- Cancel old import jobs when a new one is created [DEV-2075].
- Support for numpad hotkeys (letter/number keys and keyboard shortcuts) that allows you to label or classify the materials faster in productivity/metrics [DEV-3638].
- Support for environment files from Vault ca-injector [SRE-380].


### Bug Fixes
- Accept/Reject action does not update `updated_by` field of task [DEV-3259].
- Fixed the `terms of service` link on sign up page [DEV-3726].
- Fixed an issue where the notification about annotator's comment in draft was not sent to anyone [DEV-3339].
- Show/hide toggle on the Outliner worked with all region types [DEV-3742].
- Used Hotkey for label assignment to selected regions (`rectanglelabels`, `polygonlabels`,`keypoints`, `brushes`, `audio`, `timeseries`, `text`, `html`, `paragraph`, and so on) [DEV-3672].
- Added boundaries that limited the working area for video regions [DEV-3350].
- Fixed an issue where CSV exports incorrectly serialized complex data types [DEV-3578].
- Fixed the **Show labels inside the regions** option to work in the video template [DEV-1852].
- Fixed import tasks data validation for nested fields with repeater [DEV-3744].
- Fixed an issue when clicking the **Update** button in Label Stream lead the annotator to the next task [DEV-3773].
- Comments were associated with the current draft even when the draft was in pending save state [DEV-3733].
- Comment edited session state was displayed accurately in the updated form. (For example, `Updated 10 minutes ago`)[DEV-3692].
- Fixed an issue with the **Review** stream performance optimization [DEV-3668].
- Fixed errors on task switching after notification link [DEV-3802].
- Fixed an issue where the lack of network connection caused infinite loop of requests [DEV-3780].
- Resolved an issue for read-only file system (FS) [SRE-348].
- Fixed an issue where the Google Cloud Storage (GCS) persistent storage was broken [SRE-351].
- Fixed the issue with spam requests [DEV-3874].
- Avoided the creation of `pg_trgm` in Postgres if it existed [DEV-3839].
- Fixed review stream tasks ordering [DEV-3821].
- Informed users about invalidated control tag names when there was a mismatch between labels in configuration and labels in data [DEV-3779].
- Fixed CSV export when a few rows did not have the column values [DEV-3764].
- Unfinished regions were easily detected using the sidebar or outliner so they were completed before the task was submitted [DEV-3693].
- Changed color when a user changed the label [DEV-3490].
- Removed `MEDIA_URL` from the uploaded file path [SRE-330].
- Improved the initialization of annotation configurations to reduce the memory used by complex cases such as the `Repeater` tag [DEV-3754].
- Set the numbering of the first frame of the video timeline to be consistent  [DEV-2706].
- Fixed page crashes with enabled **Interactive View All** mode for review [DEV-3867].
- Added a fix for read-only file structure (FS) [SRE-348].
- GCS persistent storage was broken [SRE-351].
- Fixed the issue with data corruption using region manual editing through the **Details** panel [DEV-3835].
- Fixed the issue with spam requests [DEV-3874].
- Failed export in CSV: UnicodeEncodeError: `ASCII` codec failed to encode character [DEV-3852].
- Fixed `update_tasks_counters` call with DM filters [DEV-3814].
- Review statistics on the dashboard were correct when the feedback loop was enabled, and the reviewing options for the Reviewed counter on Dashboard were counted [DEV-3689].
- Fixed dashboard-members API with "action=updated" for annotation review [DEV-3789].
- Improved project duplication speed [DEV-2869].
- Admin users were not able to access the project activity logs [DEV-3240].
- Resolved a visual bug affecting overflowing text that passed the sidebar on the right [DEV-3901].
- Fixed annotation disappears on undo [DEV-2113].
- Fixed the `showSubmitButton="false"` to work correctly [DEV-3892].
- Removed WASD (W, A, S, and D represent up, left, down, and right) shortcuts from DM navigation [DEV-3958].
- Avoided the creation of `pg_trgm` in Postgres if it already existed [DEV-3839].
- Added test coverage for new project template functionality [DEV-3717].
- Users were able to pan images if an annotation history item was selected [DEV-3719].
- Correctly undo actions over the fresh loaded draft with audio [DEV-3917].
- Fixed label configuration validation for several `Choices` tags in a single view [DEV-4035].
- Allowed clearing `DateTime` values [DEV-3904].
- Exported consistency check [DEV-4021].
- Fixed an issue where the Outliner grouping changed when the task annotations were changed [DEV-3664].
- Fixed the issue with the inability to change the S3 session token once set. [DEV-1101]
- Filtered with the specific annotator worked very slowly [DEV-3865].
- Added validation for project name length in duplicate dialog [DEV-3813].
- Disabled task counter in **Label** or **Review** stream [DEV-3734].
- Downloaded storage empty path [DEV-4039].
- Fixed the broken **Review** stream on the second task using Audio v3 [DEV-3933].
- SSO failed to work with capitalized emails. Use this environment variable to enable autofix: `ALLOW_FIX_LOWERCASE_USER=true` [DEV-3988].
- Removed duplicated PDF template [DEV-4094].
- Supported copying regions in the Outliner [DEV-3646].
- Fixed an issue with undoing closed polygons by Hotkey [DEV-3896].
- Time Series truncate signal and triangle marks disappeared [DEV-3748].
- SCIM was broken and always returned a logout page [DEV-4000].
- Filtering failed to work for Annotation results [DEV-4060].
- Returned `400` bad requests on incorrect XML [DEV-3812].
    
    

## Label Studio Enterprise 2.3.1
This section highlights the breaking changes, new features and enhancements, and bug fixes in Label Studio Enterprise 2.3.1.

### Breaking changes
Label Studio Enterprise 2.3.1 includes the following breaking change:

-  This release moves Nginx to a sidecar container [DEV-3318].
-  After the announcement in LSE 2.2.9, Minio was still supported. Now, this release finally decommissions MinIO as a service [DEV-3702].

### New features and enhancements 
Label Studio Enterprise 2.3.1 introduces the following new features and enhancements.

- Allows annotators and reviewers to filter the view of transcriptions by author name [DEV-2669].
- Improve project list performance by hydrating counters in a second request [DEV-2575].
- Project duplication interface that allows users to copy projects with settings, tasks, and annotations [DEV-2702].
- Introduce the project pinning interface that allows users to pin projects for better visibility of commonly referenced projects [DEV-2629].
- Duplication of tasks and annotations in project duplication API [DEV-2539].
- Navigate taxonomy with arrow keys, Up/Down to navigate, Right to open subtree, Space to select item; also important fixes for multi-lines and interactions [DEV-2424].
- Add user notification about Storage Persistence availability [DEV-1232].
- Implement new columns for the commentary system: **comment count**, **unresolved comment count**, **comment authors**, **last comment date** [DEV-2885].
- Introduce size presets to zoom an image to fit within the viewport or to have it at its natural size (up to available space in viewport). With this release, you can now set the image to be positioned vertically (top, center, bottom) and horizontally (left, center, right) [DEV-2504].
- Introduce comments system for communication between Annotators and Reviewers. Allows a Reviewer to mark comments as resolved. Comments feature also introduces new columns in the Data Manager to be able to filter tasks by comments inside [DEV-2894].
- Add workspace grouping for Annotators, displaying the Workspaces where they are the members [DEV-1278].
- Display drop-down with model versions for each machine learning backend [DEV-1646].
- Change in rotate anchor that is no longer out of the Bbox and now are close to all resize anchors [DEV-2671].
- Add Label weights settings section in **Settings** >> **Quality** [DEV-2982].
- Add date and action filters for dashboard data [DEV-423].
- Support `PosixGroupType` for LDAP [DEV-3053].
- Add Paragraphs to substring_matching example [DEV-2362].
- Update the invite people modal to include invite by email [DEV-3065].
- Add **Resend** and **Revoke** invitation buttons to **Organization** page when a user is selected [DEV-3066].
- Update the organization role drop-down visual to show an indicator for inactive users [DEV-3091].
- Update welcome emails on signup verification and invites [DEV-3219].
- Add the ability to sustain the collapse state of the label across tasks and maintain consistency in the order of the label groups [DEV-2755].
- Cleanup lambda custom-metrics if it's not required [DEV-851].
- Add cron jobs to verify trial expiration [DEV-3138].
- Export command for open source using console [DEV-3145].
- Block the entire screen by a non-closable modal window only when the trial ends [DEV-399].
- Add option to synchronize audio with paragraphs allowing playback of chunk position [DEV-2461].
- Support a custom column order with draggable columns [DEV-2984].
- Support notifications links in Label Stream and Review Stream [DEV-1752].
- Add links to annotations in notifications [DEV-2883].
- Enable manual mode for assigning Reviewers to tasks [DEV-3078].
- Introduce new attributes for the `<Audio/>` tag: `defaultZoom`, `defaultSpeed` and `defaultVolume` [DEV-388].
- Add simpler hotkeys to jump between frames in the Video Segmentation scenario [DEV-3260].
- Add video metric with intersection for interpolated frames [DEV-1842].
- New comment behavior for Submit/Update/Skip/Accept/Reject buttons [DEV-3283].
- Support Django GCS with signed URLs without service account token creator permission [DEV-3340].
- Add the video type support and video preview to the Data Manager [DEV-3373].
- Add a list of supported video formats [DEV-3371].
- Allow negative timeseries data and additional customization options to visualization [DEV-3535].
- Introduce new Video settings in the Labeling Interface to allow changing the hop size [DEV-1041].
- Add Multi-page document annotations template with <Repeater> example among the template gallery [DEV-3545].
- Inactive users now show `Never` in the **Last Activity** column of the organization table instead of the date they were invited [DEV-3177].
- Improve revoke invite UX so it's consistent when used from the selected user section and the revoke invite button in the dropdown in User list [DEV-3196].
- Annotator's Data Manager filters persist between page navigation [DEV-3572].
- Run `api/workspaces?user_email=xxx` API call to return the list of workspaces [DEV-3567].
- The region navigation now works in scrolling (list) mode [DEV-3543].

### Bug fixes
Label Studio 2.3.1 includes the following bug fixes:

- Fixed an issue where unfinished polygons should save as draft and remain in open state if left unclosed [DEV-2432].
- Retained history on initial load of annotation review stream [DEV-2437].
- Fixed workspace filter for project list API [DEV-2785].
- Displayed source filename for tasks from storage in a separate column [DEV-2687].
- Fixed "Tasks per page" field that should be in sync with the number of tasks displayed [DEV-2170].
- Fixed an issue where **Quick View** failed to open when the user attempted to copy-paste its URL to another tab [DEV-2526].
- Deselected image region Bbox on short click [DEV-2379].
- Fixed the behavior of the drop-down menu that wasn't grouping when the organization wasn't activated   [DEV-2639].
- Added a change in rotate anchor that was no longer out of the Bbox and currently close to all resize anchors [DEV-2671].
- Prevented users from being able to edit fields that are not meant to be editable [DEV-2365].
- Multiple rendered labels in regions [DEV-2763].
- Fixed an issue where the relationship delete button wasn't working as intended [DEV-2806].
- Ensured `review_settings` was included in the initial request [DEV-2575].
- New `DateTime` tag for date, date time, or year that can be conditionally rendered [DEV-117].
- Allowed annotators and reviewers to filter view of transcriptions by author name [DEV-2669].
- Added ability to delete points with an alt click. [DEV-2431].
- Allowed users to pin/unpin projects to more easily filter and find projects of interest. [DEV-2069]
- [internal] Ensure the Feature Flag for DEV-2575 is included for projects list handling changes in DEV-2629 to decouple operation. [DEV-2852]
- Fixed `PyJWT` vulnerability [DEV-2793].
- `get_local_path` doesn't work for local-files in ML backends and converters [DEV-2827].
- Hold to continuously draw image view shapes should work with DEV-1442 enabled [DEV-2655].
- Skipped tasks are placed in the beginning of the label stream, however they should go at the end [DEV-2880]
- Added agreement calculation for `Datetime` tag [DEV-2847].
- Speed up **Members** page in case of big annotations [DEV-2148].
- Resolved an error where the 3 point Bbox would remain usable after removing rectangles from the labeling configuration [DEV-2696].
- Fixed an issue where the imported annotation was marked as read-only, but allowed users to make changes anyway [DEV-2366].
- Fixed UX and behavior when expanding/collapsing the panels and unsnapping/snapping to the sides [DEV-2851].
- Displayed drop-down with model versions for each machine learning backend [DEV-1682].
- Updated Django to 3.2.14 [DEV-2936].
- Fixed broken default page number for non-admin accounts on Projects page [DEV-2335].
- User could not edit `VideoRectangle` when it was locked [DEV-2146].
- Fixed an issue when a user can resize a panel in such a way that it obscures all the underlying content. [DEV-2926].
- Fixed clashed text entries for multi-value TextArea [DEV-2930].
- Fixed an issue when selection is still active after hiding an Image region [DEV-2922].
- Fixed an issue when selection is broken after showing previously hidden selected region [DEV-2922].
- Added columns for comment management in the Data Manager: **Comment count**, **unresolved comment count**, **comment authors**, and **last comment date** [DEV-2672].
- Prevented polygon being duplicated when finishing drawing [DEV-2967].
- Implemented new columns for the commentary system: comment count, unresolved comment count, comment authors, last comment date [DEV-2885].
- Locked polygons don't show the editable points any longer [DEV-2977].
- Removed validation for new data fields in label config [DEV-2939].
- Fixed the issue when grouping by empty label caused the app to crash completely [DEV-2942].
- Fixed an issue when Audio regions were displaced due to zoom/viewport size [DEV-2934].
- Fixed an issue when panels can fall out of the viewport if the viewport's size changed [DEV-2943].
- Recalculated overlap when changing overlap to 1 and changing enforce overlap [DEV-2420].
- Fixed user's inability to hide regions within the NER scenario [DEV-2931].
- Added a unique constraint for workspace members [DEV-3052].
- Fixed UX issue with an almost invisible text area in a region list when the region is selected [DEV-2927].
- Fixed app crash with Author Filter for Paragraphs enabled [DEV-3033].
- Fixed an issue when the text captured by a region was not displayed in the **Details** panel [DEV-2958].
- Resolved an issue affecting the tooltip of the flyout menu tooltips on small screens [DEV-3049].
- Disabled the delete button when previewing the historic item [DEV-2971].
- Showed indeterminate loading when project duplication is in progress [DEV-2892].
- Unfinished polygon region was not auto-completed when the user moved it [DEV-2514].
- Annotation region locking should not persist [DEV-2949].
- Changed environment variable for enforcing local URL check for ML backend [DEV-3058].
- Can't upload data without annotation history [DEV-3104]
- Fixed an issue when the selected **Annotation History** item was not rendered on the canvas [DEV-2970].
- Increased external storage sync job timeout [DEV-2298].
- Label weight was not reset after Labels change [DEV-3090].
- Project list had project duplicates [DEV-3126].
- Fixed an issue where a missing empty body was generated for 204 responses [DEV-3014].
- Broken "All Projects" pagination [DEV-3125].
- Fixed an issue with paragraph regions that were not selectable within the new Outliner [DEV-3030].
- Fixed configuration validation for Repeater tag [DEV-1462].
- Implemented lazyload on image to improve loading performance [DEV-3077].
- Improved polygon point removal during drawing: you can use usual undo hotkeys (ctrl/cmd+z) to remove the point you just set or redo it if you want (ctrl/cmd+shift+z) [DEV-2576].
- Fixed an issue with displaying Annotation History in LSC [DEV-2964].
- **Details** panel was automatically updating on lock action [DEV-2978].
- Disabled error for label configuration validation with <!DOCTYPE> tag [DEV-3089].
- Showed list of new users created using API correctly [DEV-3131].
- Added the Talk to an expert modal [DEV-3129].
- Added a minor correction to invite/revoke button text [DEV-3189].
- Cleaned up logging, excluding potential security concerns related to sensitive data exposure [DEV-3164].
- Resolved an issue that added an entry to the annotation history when zoom was changed [DEV-3004].
- Project list card requests used wrong Feature Flags [DEV-3222].
- Fixed an issue when the text captured by a region was not displayed in the **Details** panel [DEV-3101].
- `settings.HOSTNAME` for password reset [DEV-3190].
- Corrected an error where clearing the email field in Ask an expert modal would still allow a successful commit [DEV-3157]
- Added validation to avoid users import local files using URL [DEV-3212]
- Invite modal when opened from ribbon refreshed the **Organization** page on for submit if opened on that page [DEV-3167].
- Fixed issue when selecting the region will cause region update and changes history to record new change. [DEV-3140].
- Added updated_by to dashboard API [DEV-3232]
- The Undo functionality for video labels was broken by the Show/Hide/Lock/Unlock actions [DEV-2968].
- Improved delete tasks action speed [DEV-2296].
- Fixed an issue when locking UI disappeared when "trial days" is negative [DEV-3275].
- Fixed an issue when the image shrinks in certain cases [DEV-3061].
- Logout menu displayed in smaller screens [DEV-3204].
- Turned off lambda prefix and tags for cloud instance [DEV-2761].
- Fixed a bug where the loader would appear when user list is empty [DEV-3290]
- Tasks were not updated after filter field changed in DM [DEV-3233]
- Fixed an issue when Sentry cannot properly capture Frontend exceptions [DEV-3251].
- Excluded Deactivated/Not Activated users from project dashboards and member assignments lists [DEV-3134].
- Checked user limit for invites [DEV-3194].
- Deleted tasks were not working with some ordering (e.g. by annotators) [DEV-3313].
- Prevented the annotating collapsed phrases in paragraphs [DEV-2918].
- Fixed tabs being randomly mixed after label stream [DEV-1947].
- helm: Fixed support for Google project ids with only digits in name [DEV-3332].
- Detached menu style update [DEV-3207].
- **Copy to clipboard** icon was replaced with **Copied to clipboard** icon (green check-mark in circle) when an user clicked on it [DEV-3255].
- Cannot change the user role for a user that had their invitation revoked [DEV-3333].
- Sort order of regions grouped by labels was now based on label order + collapsed state persists through page load [DEV-3055].
- Fixed tag template [DEV-3160].
- Exact matching for attached tags (choices, numbers) ignored the labels spans [DEV-3151].
- Fixed region grouping in Outliner [DEV-3056].
- Fixed gaps on image borders on different screen sizes which may lead to slight region subpixel shifts [DEV-3322].
- Show region index in Outliner to distinguish regions [DEV-3389].
- Temporarily disabled the full-screen mode for video [DEV-3402].
- Fixed Completed field in case maximum annotations change after overlap change [DEV-3387].
- Created the possibility to enable pagination in the repeater for performance improvement [DEV-3298].
- Added more error information when ML backend validation has failed [DEV-3351].
- Allowed frames scrubbing on the timeline [DEV-3404].
- Moved the video zoom button from the top to the controls section [DEV-3405].
- Allowed video playhead/seeker scrubbing [DEV-3403].
- Fixed an issue when `TextArea` placement in the config prevents video annotation [DEV-3429].
- When a page was selected from a region, the item per page was changed to 1 and the selected item was displayed [DEV-3428].
- `labels` to textarea result was not added[DEV-2208].
- Fixed syncing data with invalid annotations or predictions [DEV-3342].
- Fixed an issue when the user was unable to pan an image that was smaller than a viewport [DEV-3356].
- Resolved an issue affecting filters [DEV-3494].
- Switching to drawing tools during the process of drawing a new region was not supported [DEV-1943].
- Fixed initial audio region history state [DEV-2211].
- Fixed an error caused by expecting a field that doesn't always exist [DEV-3502]
- Fixed video regions w/o label [DEV-3510]
- Showed unsupported video format error message if not supported [DEV-3284].
- Data manager broke when the annotator was deactivated [DEV-3520],[DEV-3465].
- Resolved an obscure issue that can occur when changing `defaultZoom`, `defaultVolume` or `defaultSpeed` in Audio tag while working with Video Timeline Segmentation [DEV-3304].
- Fixed video configuration validation [DEV-1990].
- Resolved a pagination error on Data Manager [DEV-3508].
- Fixed an issue with shifting image regions at different window sizes. [DEV-3377].
- Fixed annotator's data manager filters to persist through page reload [DEV-3492].
- Added `CreateOnlyFieldsMixin` to `BaseUserSerializer` for emails to be write-able on creation [DEV-3430].
- Fixed selected attribute in view configuration for Taxonomy [DEV-3341].
- Fixed an issue affecting per region taxonomies where value would save on submit/update but wouldn't persist visually [DEV-3566].
- Fixed an issue when high resolution videos produced bounding boxes with corrupted coordinates due to the zoom lag [DEV-3551].
- Fixed selecting regions in outline and text when browsing history [DEV-3485].
- Export failed with review counters in filters [DEV-3586].
- Fixed an issue when the meta is not saved to the region [DEV-3565].
- Removed interpolation from the currently selected frame hides the label and the selection box [DEV-2049].
- Fixed the issue when the meta is not saved to the region [DEV-3590].
- Enabled alias for taxonomy choice [DEV-3469].
- Fixed URL serialization of numeric virtual tab filters. [DEV-3557].
- Fixed loading indicator resolving too early and showing no more annotations in label stream [DEV-3560].
- Reverted current `isReady` fix [DEV-3550].
- Denied removing users by API [DEV-3598].
- Added simple equality metric for video [DEV-2776].
- Fixed issue with <Repeater> scrolling and Taxonomy annotations display [DEV-3559].
- Prevented the tabs from being removed and clearing out the related popup [DEV-3329].
- Fixed CONLL export tokenization issue with splitting into individual tokens [DEV-1923].
- Implemented Proxy storage links through nginx for auth check [DEV-2915].
- Fixed review stats recalculation after metric change [DEV-3529].
- The Bbox coordinates were preserved for both ‘Object detection' template and 'Repeater on images with taxonomy [DEV-3607].
- Fixed project card to show correct counter for finished tasks [DEV-2455].
- Removed the blocking modal when the server was unresponsive [DEV-2534].
- Added per annotation choice distribution calculation [DEV-3303].
- Fixed for projects, displayed on user's **Organization** page, include other organizations [DEV-3465].
- Annotated audio regions spanned all channels [DEV-3564].
- Previously created user through common signup failed with the SAML SSO login process [DEV-1174].
- Fixed an issue with filtering over choices [DEV-3536].
- Added agreement calculation for OCR template with `Brushlabels`, `RectangleLabels` and `Polygonlabels` [DEV-2239].
- Fixed an agreement calculation for OCR with empty text values [DEV-2202].
- Added images for empty annotations in export files for `You only look once (YOLO)` and `Visual Object Classes (VOC)` [DEV-2792].
- SAML workspaces were reset on user login when `MANUAL_WORKSPACE_MANAGEMENT` was set to false [DEV-3328].
- Cancelled skipped annotation retained previous history [DEV-2506].
- Fixed review stream for assigned tasks [DEV-3374].
- Fixed large timeseries datasets displayed incorrect `y` values [DEV-3645].
- Fixed duplicating process to copy Google source/target storage [DEV-2988].
- Fixed source storage duplicating tasks when clicking the **Sync** button multiple times [DEV-1904].
- Vertical scrolling in **Review Stream** worked the same as in **Quick View** and **Label Stream** [DEV-3353].
- Unfinished polygons were saved automatically and the history undo/redo hotkeys worked correctly [DEV-3612].
- Stacktrace was no longer visible in the server error API responses [DEV-3473].
- Resolved an issue affecting canceled skips for annotations where an incorrect button will display after [DEV-2505].
- Fixed naive metric for the regions without labels and compound configs (like <Rectangle> + <Labels>)[DEV-3201].
- Fixed OCR template agreement calculation for missing labels [DEV-3652].
- Removed project number from `file_name` of image in COCO Export [DEV-3669].
- Fixed the issue when switching between history items doesn't display selected choices/taxonomy. [DEV-2301]
- Copied all project settings from template to new project [DEV-3596].
- Fixed an issue with broken <Repeater> pagination mode when "Select regions after creating" was opted[DEV-3651].
- Logins expired after 15 minutes of inactivity or 8 days after login, based on first come first served occurrence [DEV-3397],[DEV-3397].
- Fixed validation error for history [DEV-3200].
- Resolved an issue affecting the Eraser tool which made it unusable since it cleared selected regions on tool selection [DEV-3647].
- Manual updates to region coordinates in the region editor were applied correctly and did not block moving the region [DEV-3636].
- Fixed the empty `toName` in `Control` tag [DEV-1598].
- Fixed an issue with history steps in the scenario of auto-detection [DEV-1284].
- Navigation using task links was broken [DEV-3673].
- Fixed an issue with high memory consumption, memory leakage, and increased loading times [DEV-3617].
- Added edit/delete comment functionality [DEV-2993].
- Addressed the issue when the dynamic `Choices` was saved with the incorrect/empty value [DEV-3701].
- Updated swagger docs for `AllStorage` APIs [DEV-2914].
- Added example output for `HyperTextLabels` in the Label Studio documentation suite [DEV-3632].


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
