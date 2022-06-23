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

## Label Studio Enterprise 2.2.9  
This section highlights the new features and enhancements, breaking changes, and bug fixes in Label Studio Enterprise 2.2.9. 

### New features and enhancements 
Label Studio Enterprise 2.2.9 introduces the following new features and enhancements.

- Remove comments from QuickView by default.
- Calculate only requested fields. 
- Include per model backend model version selector.
- Send export metrics to Datadog. 
- Introduce [Dynamic Labels templates](https://labelstud.io/templates/gallery_dynamic_labels.html#main). 
- Set up a fast and easy way to create accounts for E2E users. 


### Breaking changes
Label Studio Enterprise 2.2.9 includes the following breaking change.

- Decommission Minio as a service.


### Bug fixes
Label Studio 2.29 includes the following bug fixes.

- Fixed empty agreement for taxonomy with extra labels. 
- Resynchronized annotations that failed to synchronize. 
- Fixed the regions that disappeared from UI. 
- Added tags to Datadog traces. 
- Improved the annotation history name/timestamp spacing. 
- Viewed all audio crash fix.
- Fixed `is_labeled` calculation after task import. 
- Pan does not finish polygon 
- Nested choices indeterminate state. 
- Provided proxy support for content-range HTTP responses. 
- get text after granularity applied 
- Zoomed image region out of bounds. 
- Viewed all audio responsive.
- Supported lengthy unbroken taxonomy line breaks.
- Retained the size for key points. 
- Enabled additional count. 
- Fixed rendering issue on video regions. 
- Fixed the loading issue for paragraph data on QuickView. 
- Allowed edit action on Time Series results imported as read-only. 
- Fixed annotation history when exiting **View All**. 
- Enabled show comments in Data Manager to reviewers. 
- Optimized dashboard-members API performance for reviews. 
- Added X-axis zoom threshold. 
- Added guard with an error message for non-incremental, non-sequential datasets. 
- Enabled Query optimization for Uniform Sampling. 
- Disabled the delete **all region** button when an annotation is read-only. 
- Fixed blind SSRF on add model and import.
- Deselected ImageView bounding box before creating another. 
- Fixed FF ticket number.
- Fixed runtime error when duration was not extracted.
- Fixed permissions for a manager role.
- Fixed `annotation_id` was provided as float value in CSV export. 
- Fixed data in SERP (Search Engine Results Page) ranking in-app template. 
- Fixed an issue where the Newsletter notification disappeared and then reappeared. 
- Unfinished polygon zoom fix. 
- Fixed flickering issue when regions were created with Bounding box.
- Video regions were edited when anno history was selected. 
- Added background as a new parameter. 
- Model version selector only on edit of ml backend, fix form layout.
- Added to string. 
- Fixed synchronization speed between video and audio. 
- Replaced `inner_id` index with multicolumn.
- Fixed an issue with prop `whenChoiceValue`. 
- If control weights are updated - recalculate stats.
