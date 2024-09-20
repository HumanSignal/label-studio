---
title: Custom scripts for projects
short: Custom scripts
tier: enterprise
type: guide
order: 0
order_enterprise: 108
meta_title: Custom Scripts
meta_description: Use JavaScript to customize your labeling interface. 
section: "Create & Manage Projects"
date: 2024-07-30 10:39:03
---


!!! note
    Custom scripts are not available unless enabled. There are [important security considerations](#Security-notes-constraints-and-limitations) to understand before requesting access. To enable custom scripts for your organization, contact your account manager. 

You can extend your Labeling Configuration by implementing a custom JavaScript script.  

Custom scripts are defined in the project settings under the Labeling Interface section: 

![Screenshot of script option](/images/project/scripts.png)

!!! note
    Only users who are in the Admin, Owner, or Manager role can access the project settings to configure custom scripts. 

See the following video for a brief overview and demonstration of custom scripts:

<iframe width="560" height="315" src="https://www.youtube.com/embed/Spwg81kJdGo?si=miRkS7DDYe9aLyUw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Use cases

Custom scripts allow you to enhance and tailor your labeling interface and workflow. For example:

* **General validation** – Custom scripts can be used to implement various validation checks to ensure the quality and consistency of annotations. 

    Examples: Data integrity checks, logical consistency checks, completeness checks. 

* **Incorporate dynamic elements** – Incorporate dynamic visualizations into the labeling interface to provide context or aid annotators in their tasks. 

    Examples: Charts or other data visualizations, insert custom options for tasks, real-time visual aids for annotations. 

* **Query external databases** – Enable dynamic querying of external databases to fetch data necessary for annotation tasks. 

    Examples: Retrieving contextual data, retrieving the latest data to populate choices

* **Workflow validations and customizations** – Use custom logic and validations to trigger subsequent workflows or actions based on the outcomes of the current annotation task.

    Examples: Feedback loops for annotators, conditional routing/assignment, progressive sampling, notifications regarding project progress. 

For examples of how some of these use cases can be implemented, see [Custom script examples](script_examples). 

## How custom scripts work

Custom scripts are authored in JavaScript and are project-specific. They are limited to specific tasks and the annotation workflow and cannot, for example, be used to create new pages or otherwise extend the core functionality of Label Studio. 

### Execution

Custom scripts are executed each time the annotation is displayed.  For example, when you open a task, move between tasks, create a new annotation, switch between annotations, create a new annotation, and view older versions of the annotation. 

This means that for each annotation you can add specific behavior. However, it also means that if you don’t plan accordingly when constructing your script logic, you could end up with repetitive actions.

To avoid multiple event subscriptions (and, consequently, multiple handler triggers), it is best to use `LSI.on()` because the handlers that are added using this method will be unsubscribed after the current annotation is closed. For more information on LSI, [see below](#Label-Studio-Interface-LSI). 

!!! note
    Because custom scripts can be executed multiple times for the same annotation, you need to take measures to avoid issues such as infinite loops, memory leaks, and application crashes. For this reason, we recommend that each script run cleans up the previous run, meaning that event handlers should be stored in a global register along with their parameters so that they can be checked, stopped, or adjusted. Every handler should check whether it is still running over the current version of annotation/data in case it has changed.

    However, handlers attached via `LSI.on()` are safe and will automatically handle this clean up process.

!!! info Tip
    Custom scripts are executed within an asynchronous function, so you can use `await` as necessary. 

### Troubleshooting and debugging

It is important to test and refine scripts using a test project first to avoid any disruptions on live projects. 

Note the following:

* Use the Console tab in your web browser’s developer tools to check for errors and verify the script is running. 
* You can also check the Network tab (script information is returned with the `/project/:id` API call).
* You can add [`debugger`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger) to your script to have a convenient breakpoint to debug the script using your web browser’s developer tools. 

### Security notes, constraints, and limitations

Custom scripts are a powerful tool to help you fully customize your labeling workflow. In doing so you are running arbitrary JavaScript code on each annotator’s machine, which comes with certain risks. 

Because of this, you must opt-in before enabling custom scripts for your organization, and we urge you to use this feature with caution.

To enable custom scripts for your organization, you cannot have members that are in multiple organizations. This is enforced through application logic and is necessary for data security. The most common reason for this is when users have accounts in an expired free trial, but can also happen if you are using multiple organizations for project management or if you have an initial proof of concept or testing org. 

## Label Studio Interface (LSI)

The Label Studio Interface (LSI) is a helper object that is designed to be used with custom scripts. 

LSI simplifies access to some data and can perform special actions that only make sense within the framework of custom scripts.

### Instance methods

##### `LSI.import(url, integrity)`

Allows loading additional external scripts

| Parameter  &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; | Type     | Description          |
|--------------------------|--------------------|--------------------------|
| `url` | string | Specifies the URL of an external script file.                                 |
| `integrity`  | string | Allows a browser to check the fetched script to ensure that the code is never loaded if the source has been manipulated.  |

The method is asynchronous, so you can wait for the script to load before performing the main actions. For example:

```javascript
await LSI.import('https://cdn.plot.ly/plotly-2.26.0.min.js', 'sha384-xuh4dD2xC9BZ4qOrUrLt8psbgevXF2v+K+FrXxV4MlJHnWKgnaKoh74vd/6Ik8uF');
console.log("Plotly is ready");
```

##### `LSI.on(eventName, handler)`

Subscription to listen to events related to the Label Studio Frontend. Handlers attached/subscribed using this method will be unsubscribed when switching to another annotation. Any handlers inside this method should be secured manually.

For a list of all available events, see our [Frontend reference](frontend_reference#Available-events).

| Parameter &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; | Type     | Description          |
|--------------------------|--------------------|--------------------------|
| `eventName` | string | A case-sensitive string representing the event type to listen for.                  |
| `handler`  | function | A function that will be called when the event is triggered. This function can take arguments depending on the event.  |


##### `LSI.dataObj`

Alias to `.task.data`. This is the core data structure for a task, and includes the original data that needs to be annotated.

##### `LSI.task`

A getter that returns information about current task:
* `id` - ID of the task. 
* `data` - Object representing task data. 

##### `LSI.annotation`

A getter that returns the currently selected annotation.

##### `LSI.regions`

A getter that returns all regions of the current annotation.


## Frontend API implementation details

The following implementation details may be useful when creating your own custom scripts. 

!!! note
    While these details are relatively stable, we make no guarantees that they will not change in the future. 

For more information on how annotations are stored and formatted, see [How Label Studio saves results in annotations](task_format#How-Label-Studio-saves-results-in-annotations). 

### Regions

!!! note
    These are used within `Htx.annotationStore.selected`. For example, `.regions` would be specified as `Htx.annotationStore.selected.regions`. For an example of this in use, see [Bulk creation and deletion operations with keyboard shortcut](script_examples#Bulk-creation-and-deletion-operations-with-keyboard-shortcut). 


##### `.areas` 

Map of regions.

##### `.regions` 

An array of all regions (includes classifications). 

##### `.regionStore.regions` 

An array of all real regions (excludes classifications).

##### `.results` 

Array of all results. 

Note that this returns an array of objects with keys of all possible result types, but only one result type has an actual value. To access this value directly, use `result.mainValue` (which works as a shortcut for `r[control.valueType]`).

### Labels

!!! note
    `region` is retrieved by `.region` (see above).

##### `region.labelings` 

Array of all labeling results for this region.

##### `region.labeling` 

The first labeling result.

##### `region.labels` 

An array of label texts from `labeling`, but does not include other labeling results. 

##### `region.labelName` 

The label text of the first label in the first labeling result. 

##### `region.labeling.selectedLabels` 

An array of `<Label>` tags connected to every label in `labeling`. 

For example, to retrieve the label color you can use `region.labeling.selectedLabels[0].background`. 

##### `region.labeling.getSelectedString(joinStr = " ")` 

Returns a string with all labels in `labeling`. By default, these are concatenated with the param followed by a space (e.g. `“A B”`).

##### `region.getLabelText()` 

Returns a string with comma-separated list of labels in `labeling`, with optional text of the first per-region TextArea result. Formatted as follows: `“A,B: text”`