---
title: (Concat) On-Premise Release Notes for Label Studio Enterprise
short: (Concat) On-Premise Release Notes
type: guide
tier: enterprise
order: 221
order_enterprise: 142
section: "Reference"
meta_title: On-premise Release notes for Label Studio Enterprise
meta_description: Discover what's new and improved, and review bug fixes, in the release notes and changelog for Label Studio Enterprise.
---

!!! info 
    The release notes for Label Studio Community Edition is available on the <a href="https://github.com/heartexlabs/label-studio/releases"> Label Studio GitHub repository</a>.

!!! info 
    The release notes for Label Studio Enterprise Cloud (SaaS) is available <a href="https://heartex.com/changelog">here</a>.

<a name="243md"></a>

## New helm chart

A common chart for LS and LSE has been released and is available since LSE version 2.3.x. The chart can be accessed at the following repository: https://github.com/heartexlabs/charts/tree/master/heartex/label-studio.

### Migration Process

The migration process can be performed without any downtime. The steps required to carry out the migration are documented in the migration guide, available at: https://github.com/heartexlabs/charts/blob/master/heartex/label-studio/FAQs.md#label-studio-enterprise-upgrade-from-decommissioned-label-studio-enterprise-helm-chart.

### Deprecation of the Old Chart

The old chart `heartex/label-studio-enterprise` **has been deprecated**. Support for as many releases as possible will be provided. A notification will be posted in the Release Notes section when this changes. We hope that this revised chart will meet your technical needs. If you have any questions or concerns, please don't hesitate to reach out to us.
  
## Label Studio 2.4.3

### Improvements
- Support simultaneous render of multi-channel audio with added splitchannels="true" option on Audio config (larger memory requirement) [LSDV-3028](https://labelstudio.aha.io/features/LSDV-3028)
- Allow selecting task automatically on Data Manager page whenever the user presses shift+up/down [LSDV-3093](https://labelstudio.aha.io/features/LSDV-3093)
- Restore locked annotations [LSDV-3062](https://labelstudio.aha.io/features/LSDV-3062)
- Navigation back to previous tasks in labeling stream is now persistent against page reloads and user labeling sessions [LSDV-3936](https://labelstudio.aha.io/features/LSDV-3936)
- Add sync update of is_labeled field [LSDV-2981](https://labelstudio.aha.io/features/LSDV-2981)
- Improved responsiveness for image regions selection [LSDV-3871](https://labelstudio.aha.io/features/LSDV-3871)

### Bug Fixes
- Fixed bug with presigned TTL setting in cloud storage connection being not persistent [LSDV-2836](https://labelstudio.aha.io/features/LSDV-2836)
- Slider follows the positional seeker in video when using the step forward or backward buttons. [LSDV-983](https://labelstudio.aha.io/features/LSDV-983)
- Now it is possible to retrieve the list of uploaded files with `api/projects/<project-id>/file-uploads&all=true` request [LSDV-4614](https://labelstudio.aha.io/features/LSDV-4614)
- Improved performance for projects page and annotation-related API [LSDV-961](https://labelstudio.aha.io/features/LSDV-961)
- Setting - Quality - Custom weights: UI too limited [LSDV-4535](https://labelstudio.aha.io/features/LSDV-4535)
- Wrong xpath in annotation result (remove FF) [LSDV-1376](https://labelstudio.aha.io/features/LSDV-1376)
- Fixed an issue with missed step of setting password for invited users [LSDV-1530](https://labelstudio.aha.io/features/LSDV-1530)
- AnnotationReview stats are calculated in 2 separate jobs [LSDV-4632](https://labelstudio.aha.io/features/LSDV-4632)
- Task data with dicts in array are incorrectly resolved [LSDV-4621](https://labelstudio.aha.io/features/LSDV-4621)
- Fixed authorization check for roles change [LSDV-3856](https://labelstudio.aha.io/features/LSDV-3856)
- Prevent persistent Cross-Site Scripting (XSS) in Activity Log [LSDV-3855](https://labelstudio.aha.io/features/LSDV-3855)
- Fixed issue with saving empty drafts [LSDV-3009](https://labelstudio.aha.io/features/LSDV-3009)
- Unclear error about unknown tag [LSDV-2556](https://labelstudio.aha.io/features/LSDV-2556)
- Migration for fixing organization id in activity logs [LSDV-4629](https://labelstudio.aha.io/features/LSDV-4629)
- The first Audio V3 region created is not added to the undo stack [LSDV-1138](https://labelstudio.aha.io/features/LSDV-1138)


<a name="242md"></a>

## Label Studio 2.4.2

### New Feature
- Labels are not displayed inside the regions [LSDV-1142](https://labelstudio.aha.io/features/LSDV-1142)
- Add YOLO support for PolygonLabels in export options [LSDV-2973](https://labelstudio.aha.io/features/LSDV-2973)

### Improvement
- Backend: Update invite url to send user to new password page [LSDV-3029](https://labelstudio.aha.io/features/LSDV-3029)
- Postpone button is disabled if there is no new comments on label steam [LSDV-2976](https://labelstudio.aha.io/features/LSDV-2976)
- Rendering performance improvements for large-duration audio [LSDV-3082](https://labelstudio.aha.io/features/LSDV-3082)
- Variable frame rate for videos using frameRate="$fps" doesn't work [LSDV-3036](https://labelstudio.aha.io/features/LSDV-3036)
- Display correct docs links in LSE/LS [LSDV-2999](https://labelstudio.aha.io/features/LSDV-2999)

### Bug fixes
- User can resize bbox as he wants if ImageView is zoomed. [LSDV-1066](https://labelstudio.aha.io/features/LSDV-1066)
- Fixed issue with keeping zoom position on resize of working area [LSDV-967](https://labelstudio.aha.io/features/LSDV-967)
- Fix appearance of all the connected labels to region in Details view [LSDV-1050](https://labelstudio.aha.io/features/LSDV-1050)
- Text and HyperText elements can be added without value and name [LSDV-1037](https://labelstudio.aha.io/features/LSDV-1037)
- Datetime annotation produces empty payload for the value: {} [LSDV-1015](https://labelstudio.aha.io/features/LSDV-1015)
- Page breaks on completing audio Annotation (when using large audio files in a ParagraphLabels project) [LSDV-2191](https://labelstudio.aha.io/features/LSDV-2191)
- In data manager UI, the moving and resize are mixed, resize is not usable [LSDV-1083](https://labelstudio.aha.io/features/LSDV-1083)
- Postpone mode reverts task back and forces user to create 10 annotations in a row [LSDV-1044](https://labelstudio.aha.io/features/LSDV-1044)
- Quick View breaks when navigating between annotations [LSDV-1098](https://labelstudio.aha.io/features/LSDV-1098)
- Video zoom doesn't follow the cursor pointer location [LSDV-1298](https://labelstudio.aha.io/features/LSDV-1298)
- Task locks missed in postponed / skipped queue [LSDV-960](https://labelstudio.aha.io/features/LSDV-960)
- Taxonomy titles clash (reappearing bug) [LSDV-1056](https://labelstudio.aha.io/features/LSDV-1056)
- Administrator can't be removed from project members [LSDV-1167](https://labelstudio.aha.io/features/LSDV-1167)
- Four digits added at the end of image file_name in outputted COCO jsons   [LSDV-1311](https://labelstudio.aha.io/features/LSDV-1311)
- Optimize memory and speed during exports [LSDV-1010](https://labelstudio.aha.io/features/LSDV-1010)
- maxUsages for KeyPointLabels and RectangleLabels doesn't work [LSDV-1322](https://labelstudio.aha.io/features/LSDV-1322)
- Fixed an issue with backspace hotkey in Audio [LSDV-1148](https://labelstudio.aha.io/features/LSDV-1148)
- Import jobs are submitted twice (or more) times [LSDV-992](https://labelstudio.aha.io/features/LSDV-992)
- Details section layout is broken when long named labels are used  [LSDV-1038](https://labelstudio.aha.io/features/LSDV-1038)
- Second click on label unselects it and creates 'No label' [LSDV-3004](https://labelstudio.aha.io/features/LSDV-3004)
- Fix missing tasks in Data Manager upon upload [LSDV-1058](https://labelstudio.aha.io/features/LSDV-1058)
- Region is selected when user drag the region [LSDV-1140](https://labelstudio.aha.io/features/LSDV-1140)
- Saving model version on Machine Learning settings doesn't work [LSDV-966](https://labelstudio.aha.io/features/LSDV-966)
