# LSF init

Different thoughts and investingations related to LSF init.

## App render

- `SidePanels/TabPanels/SideTabsPanels` (sic!!) + `OutlinerTree` + `BottomBar`
- `TopBar` with annotations tab by `AnnotationsCarousel` + custom actions

Legacy paths (FF_1170) used different components (`SidebarTabs`, `AnnotationTab`, `Entities/RegionTree`, `TopBar/Annotations`); those code paths are deprecated or removed.

## configureStore, environments and init

configureStore() has the idea of environment, which comes from development/production run
and contains some very important but not irreplaceable things:
- rootElement() (yes, that's a function!) is redundant
- getData() should be embedded
- getExample() is definitely too much — example should be set from outside
- configureApplication() just passes through a lot of methods with default values which are just a placeholders

## selected annotations

All annotations should've been always selected on init, most probably because of some weird issues in the past.
Don't think we need it now. That could be pretty heavy operation. And it's something we should always think about.

## `AppStore#initializeStore`

Main flow: LabelStudio -> constructor -> createApp -> configureStore -> initializeStore (+src/Component does the similar)

Also it's called at these places right after `assignTask()`:
- AnnotationPreview (?)
- Config/Preview
- ReviewPage -> setTask
- lsf-sdk -> setLSFTask

## `hydrated`

Should prevent some types of objects from requesting resources too early because the whole LSF will be recreated.

It's default to `false` in AppStore;
but set to `true` by default in configureStore if value is not reassigned.
Can only be changed on init if Audio3 FF is on.

For some reason it's set to `false` in lsf-sdk constructor, but `true` in ReviewPage's setTask.
But is set to `true` in lsf-sdk setLSFTask.

Apparently it was not used anymore after https://github.com/HumanSignal/label-studio-frontend/pull/1166

## `userGenerate` and `sentUserGenerate`

wtf?? lot of logic without comments

There is `Annotation#exists` getter to check that annotation was saved and can be updated.

`userGenerate` is used to mark annotations that were added by user in current session or is still a draft. Is set to true when:

- annotation created by user in `createAnnotation()`
- annotation created from prediction in `addAnnotationFromPrediction()`
- draft is loaded without annotation in `setAnnotation()` in lsf-sdk
- is set by default to true, so it’s worth to check other places; but it defaults to false in `createItem()`

Can be submitted in current session, but this flag will remain the same.

## `setAnnotation()`

called from 3 places:

- `setLSFTask()`
- `onStorageInitialized()` — called from `AppStore#initializeStore()`, one of the core LSF methods; if there is a task and that’s not a Label Stream it selects annotation based on `initialAnnotation` and `lastAnnotation`
- `onDeleteAnnotation()`

## Huge mess with "side panels"

FF_3873 has been removed; the supported interface uses `components/SidePanels/TabPanels/SideTabsPanels.tsx`. Legacy variants (SidebarTabs, SidePanels without TabPanels) are disabled in a couple of places.

Also the whole `App.panels` prop is only used in the first, the oldest version.

Apparently, `panels` were used only to add Comments tab and even this tab was moved into AnnotationTab after
https://github.com/HumanSignal/label-studio-frontend/pull/774. So they are removed along with anything related.

## `assignTask`



## `initializeStore`

`afterReset()` — refill StaredStorage Stores in `extender.js`, but looks like it's not used

initRoot — config

for every prediction: addPrediction, selectPrediction, deserializeResults

for every annotation: addAnnotation, selectAnnotation, deserializeResults, reinitHistory (!!)

setInitialValues for last annotation

setHistory to set annotation history — some messed up thing in general

set initialized = true and invoke storageInitialized


### problematic places during store init

They might require annotation to be selected.

ToolManagerMixin.afterAttach() — does lot of things with tools, selecting, unselecting, assigning

RelationStore.afterAttach() — was referring to selected annotation; fixed

Annotation.afterAttach() calls super helpful method annotationAttached(), but it's only implemented in Pairwise


## What could happen on `deserializeResults()`?

prepareAnnotation -> fixBrokenAnnotation -> some changes on result json

deserializeSingleResult for every result in JSON — some area/result/state manipulations,
should be no side effects.
it calls `updateAppearenceFromState` for merged labels and results (only Video tag regions),
but this should only be called on selected annotation.

cleanClassificationAreas — WUT???

updateFromResult for every global classification — a bit redundant unless we select annotation;
but there is `hidden` param already, used only on Annotation History deserialization.

deserializeRelation for every relation


# Streams

- one-way data flow
- describe all possible external things that can affect current view

# Still left to fix after https://github.com/HumanSignal/label-studio-frontend/pull/1640

- Annotation History should be updated with correct annotation when we select it from View All; why not to do the same on usual annotation select? and if we do why do we need special case here?

- **Experiment**: use dev addons from outside via additional entry point for webpack. And how to distinguish this from e2e runs? Additional param?

- `description` option should be renamed to `instructions`


# Other improvements


https://github.com/HumanSignal/label-studio-frontend/blob/d0dd212bf7b12cb7f4469c9c2aa32dfe166f5abe/src/stores/RegionStore.js#L181-L183
could be shifted towards self.selection.selectRegions(regions) and then
https://github.com/HumanSignal/label-studio-frontend/blob/d0dd212bf7b12cb7f4469c9c2aa32dfe166f5abe/src/stores/RegionStore.js#L45-L47
can be changed to usual method called only once.




# Current changes

### Main change

**Only one annotation is selected during task opening.**

We have the concept of selecting annotation, when we not just assign it as current one, but also update data in tags, trigger external event, load annotation history, setup hotkeys, set initial values.

Previosly it was required to select every annotation to do some extra work in regions/tags inside it because of some quirky legacy code. I fixed what I found so far and ran all possible tests — they all are green, so consider this change mostly safe.

Benefits:
- improved performance as only one annotation is selected, reducing number of calculations and renders
- no excess network requests to retrieve annotation history for every of these annotations
- more clean code
- one more step to remove one of the oldest legacy concept of `states`: it's not used in init anymore

Things changed:
- `STORE_INIT_OK` global var added to catch tags that can't properly work with new system (edge cases we missed)
- apparently we have only one unit test for tags — Ranker; it's securely mocked

Concerns:
- `states` in Video tag select only *Labels controls, but changed code is in `fixBrokenAnnotation` which will do nothing to Video anyway
- in potential missed edge case app will just crash
- we could potentially check that we are inside init process by some flag, right?

### Other changes
- removed Predictions panel and related code like showAllPredictions
- removed panels from App and down the stream — we don't use them anywhere (3rd party LSF can be affected, but not sure anyone using panels there)
- converted `LabelStudio.js` to TypeScript
- fixed bunch of annoying react warnings (non-html props, wrong values, missed refs)
- started to reorganize our "envs" to get rid of them at some point; for now it's `getRoot()` removed from there
- removed `SidebarPage` as it was useless, plus removed multi-tabs support from `SidebarTabs` as `panels` were not used; plus that's all only for the old interface which is about to be removed
- removed `hydrated` as it's not used anymore after https://github.com/HumanSignal/label-studio-frontend/pull/1166