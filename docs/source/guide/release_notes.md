---
NOTE: Don't change release_notes.md manually, it's automatically built from onprem/*.md files on hexo server run!   

title: On-Premises Release Notes for Label Studio Enterprise
short: On-Prem Release Notes
type: guide
tier: enterprise
order: 221
order_enterprise: 142
section: "Reference"
meta_title: On-premises release notes for Label Studio Enterprise
meta_description: Review new features, enhancements, and bug fixes for on-premises Label Studio Enterprise installations. 
---

!!! note 
    The release notes for Label Studio Community Edition are available from the <a href="https://github.com/HumanSignal/label-studio/releases">Label Studio GitHub repository</a>.

## New helm chart

A common chart for LS and LSE has been released and is available as of LSE version 2.3.x. The chart can be accessed at the following repository: https://github.com/HumanSignal/charts/tree/master/heartex/label-studio.

### Migration Process

The migration process can be performed without any downtime. The steps required to carry out the migration are documented in the migration guide, available at: https://github.com/HumanSignal/charts/blob/master/heartex/label-studio/FAQs.md#label-studio-enterprise-upgrade-from-decommissioned-label-studio-enterprise-helm-chart.


<a name="2410md"></a>

## Label Studio Enterprise 2.4.10

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


<a name="249-7md"></a>

## Label Studio Enterprise 2.4.9-7

*Aug 22, 2023*

### Bug fixes
- Fixed double encoding issue with file-proxy urls

### Security
- GH 4483 (in Label Studio repo) made existing SSRF defenses more robust



<a name="249-6md"></a>

## Label Studio Enterprise 2.4.9-6

*Aug 21, 2023*

### Bug fixes
- Fixed the splitchannel audio option.
- Fixes SCIM group push so workspaces are not created from groups if role to group mappings already exist.



<a name="249-5md"></a>

## Label Studio Enterprise 2.4.9-5

*Aug 11, 2023*

### Bug fixes
- Fixed an issue where pre-signed urls could become double encoded and break signatures.



<a name="249-4md"></a>

## Label Studio Enterprise 2.4.9-4

*Aug 04, 2023*
<!-- Release notes generated using configuration in .github/release.yml at lse-release/2.4.9 -->

### New features

Add Draft Column to the Data Manager

### Bug fixes

* Fixed a TLS issue for older LDAPs.




<a name="249-2md"></a>

## Label Studio Enterprise 2.4.9-2

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


<a name="248-1md"></a>

## Label Studio Enterprise 2.4.8-1

*Jun 26, 2023*

### Bug fixes
- Fix Review N Tasks with URI too long



<a name="248md"></a>

## Label Studio Enterprise 2.4.8

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


<a name="247md"></a>

## Label Studio Enterprise 2.4.7

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



<a name="246-1md"></a>

## Label Studio Enterprise 2.4.6-1

*May 09, 2023*

### Bug fixes
- Fixes an issue with using local file upload with cloud storage urls causing errors.



<a name="246md"></a>

## Label Studio Enterprise 2.4.6

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



<a name="245md"></a>

## Label Studio Enterprise 2.4.5

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



<a name="244md"></a>

## Label Studio Enterprise 2.4.4

### New features
- New parameter skipDuplicates of TextArea allows to keep submissions unique.

### Enhancements
- Audio v3 webaudio alternative decoder option
- s3 custom endpoint support for persistent storage
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


<a name="243md"></a>

## Label Studio Enterprise 2.4.3

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


<a name="242md"></a>

## Label Studio Enterprise 2.4.2

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


<a name="241md"></a>

## Label Studio Enterprise 2.4.1

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

<a name="240md"></a>

## Label Studio Enterprise 2.4.0
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

<a name="231md"></a>

## Label Studio Enterprise 2.3.1
This section highlights the breaking changes, new features and enhancements, and bug fixes in Label Studio Enterprise 2.3.1.

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

<a name="2210md"></a>

## Label Studio Enterprise 2.2.10

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

<a name="229md"></a>

## Label Studio Enterprise 2.2.9

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

<a name="228md"></a>

## Label Studio Enterprise 2.2.8

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

<a name="22md"></a>

## Label Studio Enterprise 2.2.0

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
