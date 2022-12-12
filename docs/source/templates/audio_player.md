---
title: Audio Player
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 309
meta_title: Audio Player
meta_description: Template for audio player interactions in the Label Studio interface for your machine learning and data science projects.
---

<img src="/images/templates-misc/select_region_audio_player.png" alt="" class="gif-border" width="598.4px" height="319.2px" />


!!! attention "important"
    - This is a new alternative to the existing audio engine. 
    - Label Studio Open Source users who wish to return to a previous audio engine version must set an environment variable on their operating instance: `ff_front_dev_2715_audio_3_280722_short=false`.


The audio labeling platform introduces the enhancements of the audio player with the ability to annotate audio files up to two hours in length, provide fine-grain annotation controls, and implement an efficient rendering engine that displays the audio waveforms while remaining performant, even with large, and multi-hour audio files. You can now play and navigate through an audio waveform by precisely managing the labeled regions. Regions and relations are simple to manage and manipulate on the audio waveform and interface.


!!! attention "important"

    The enhancement is not constrained to predefined templates but can be configured by leveraging a brand-new <audio> tag that supports all labeling use cases.


## Terminologies

The following terminologies are used throughout this document for easy understanding and navigation. 

1. Audio zoom is a component that spans the player and is represented by a small illustration of the audio waveform. Users can use this to view the full length of the audio waveform, control the view of the audio waveform display, and scrub along the audio file.

2. Playhead indicator is represented in timeline and audio zoom. It is displayed as a line that marches along the audio once the play button is pressed. The playhead on the timeline has a distinct head that users can grab and move along the timeline.

3. Region is represented by the color of the label that has been assigned to it and will have attributes like duration displayed in the **Selection details** pane located in the **Details** panel. Regions are persistent and can be manipulated by users.

4. Segment duration may be displayed as a timestamp with a beginning and end. For example: while a region is selected the duration will be visible in the **Selection details** pane located in the **Details** panel. 
Segment is indicated by a gray tone section on the audio waveform and the timeline that can be used to isolate a duration for playback and to create a region by assigning a label. They are a temporary selection that will not persist.

5. Zoom controller is represented as a rectangle with a stroke. The frame in the zoom allows users to change the view of the audio waveform displayed above, or move to a different location in the audio waveform.


## Role Permissions 

As a reviewer and annotator, you can do the following:
- Add one or more segments
- Add labels to segments
- Add and edit regions


## Components of the Audio Player 

<center>
<img src="../images/audio-experience/audio-player-diagram.png" class="gif-border"/>
</center>
    <i>Figure 1: Audio player. </i>


## Audio Player enhancements

The audio player provides the following enhancements: 

1. [Working with Segments](#working-with-segments)
    - [Create segments](#create-segments).
    - [Assign a label to a segment](#assign-a-label-to-a-segment).
2. [Working with Regions](#working-with-regions) 
    - [Create regions](#create-regions).
    - [Overlap regions](#overlap-regions).
4. [Manage segments and regions](#manage-segments-and-regions). 

### Working with Segments 
This section describes the steps required to create segments and assign a labal to segments. 

#### Create segments
Create or add a segment on the audio waveform or timeline by clicking and dragging to set the duration of the segment. 

!!! note 
    - A segment does not create a region until a label has been assigned. 
    - You can manipulate the segment without affecting any regions that exist.

1. Draw a segment
<center>
<img src="../images/audio-experience/specific_location_create_segment.png" class="gif-border" />
</center>
    <i>Figure 2: Create a segment from a specific location. </i>

2. A segment is created in a specific location.
<center>
<img src="../images/audio-experience/segment_created_specific_location.png" class="gif-border" />
</center>
    <i>Figure 3: Segment creation. </i>

#### Assign a label to a segment
Select a segment and assign a label to it only when an audio waveform or timeline is visible on the interface. Also, you can create a region on the audio waveform by assigning a label from the available options.

1. Select a segment in a region.
<center>
<img src="../images/audio-experience/segment_selected_regions.png" class="gif-border" />
</center>
    <i>Figure 4: Create a segment. </i>

2. Assign a label to the segment.
<center>
<img src="../images/audio-experience/assign_label_selected_regions.png" class="gif-border" />
</center>
    <i>Figure 5: Label assignment. </i>

3. A label is assigned to a segment.
<center>
<img src="../images/audio-experience/assigned_label_segment.png" class="gif-border" />
</center>
    <i>Figure 6: Assigned a label to a segment. </i>

### Working with Regions
This section describes the steps required to create regions and overlap regions. 

#### Create regions
Select a label and then draw the region on the audio waveform by clicking and dragging then releasing the mouse. Now, you can see the beginning and ending timestamps in the tool tip during creation. Upon creation, the region is selected and the **Details** panel will then display the attributes in the **Selection details** pane. 

!!! attention "important"
    While drawing a region, a crosshair cursor is displayed to inform that you are adding instead of manipulating the drawing. The crosshair cursor will disappear when you complete the drawing. 

1. Select a label to create a region.
<center>
<img src="../images/audio-experience/select_label_create_region.png" class="gif-border" />
</center>
    <i>Figure 7: Choose a label. </i>

2. Place the label in a starting position.
<center>
<img src="../images/audio-experience/place_label_start_location.png" class="gif-border" />
</center>
    <i>Figure 8: Point to the starting position. </i>

3. Draw a region on the audio waveform by clicking and dragging then releasing the mouse in the ending position.
<center>
<img src="../images/audio-experience/place_label_ending_location.png" class="gif-border" />
</center>
    <i>Figure 9: Create a region. </i>

!!! attention "important"
   - In the **Selection details** pane, you cannot set the beginning time to exceed the ending time. 
   - The following errors occur when the beginning time exceeds the ending time:
        - Error state will appear for this input.
        - There will be no update to the result and a temporary notification will display an error message.

A region from the start to end position on the audio waveform is created.
<center>
<img src="../images/audio-experience/created_region.png" class="gif-border" />
</center>
    <i>Figure 10: Region is created. </i>

#### Overlap regions
Draw regions on the audio waveform that allows for overlapping without the interference of other regions or objects. 

!!! note
    - There is a dependency on the local user settings that may override the ability to create regions one after the other.
    - Segments and regions may overlap without impacting each other.

1. Select a label to create an overlap region in the audio waveform.
<center>
<img src="../images/audio-experience/select_label_create_overlap_region.png" class="gif-border" />
</center>
    <i>Figure 11: Select a label. </i>

2. Place the start position of the label on the audio waveform to begin drawing the region to overlap with another existing revision. 
<center>
<img src="../images/audio-experience/place_label_start_location_overlap_region.png" class="gif-border" />
</center>
    <i>Figure 12: Point to the starting position. </i>

3. Draw a region on the audio waveform by clicking and dragging then releasing the mouse in the ending position.
<center>
<img src="../images/audio-experience/place_label_end_location_overlap_region.png" class="gif-border" />
</center>
    <i>Figure 13: Point to the ending position.</i>

4. An overlapped region from the start to end position on the audio waveform is created. 
<center>
<img src="../images/audio-experience/created_overlapped_region.png" class="gif-border" />
</center>
    <i>Figure 14: Overlapped region is created.</i>


### Manage segments and regions

#### Segment duration
When you select a region, the **Selection details** pane will display the start and end timestamp that you can use to change the duration of your selection. You can set or adjust the duration by editing the time in the segment duration. The **Selection details** pane displays the total duration of the selected segments.
<center>
<img src="../images/audio-experience/set_segment_duration.png" class="gif-border" />
</center>
    <i>Figure 15: Set segment duration.png</i>

#### Resize segments and regions
To resize selected regions, you must click, hold, and drag to the desired location and length. Dragging to the beginning time will exceed the ending time and swap the values for segment duration. You can resize an audio segmentation on the player wavelength after selecting that region.

1. Select the region to resize.
<center>
<img src="../images/audio-experience/resize-hover-region.png" class="gif-border" />
</center>
    <i>Figure 16: Resize the hover region.</i>

2. Resize the audio segmentation on the player wavelength after selecting that region.
<center>
<img src="../images/audio-experience/resize_timestamp_segment.png" class="gif-border" />
</center>
    <i>Figure 17: Resize the audio segmentation.</i>

3. Drag the slider to resize the segment. 
<center>
<img src="../images/audio-experience/resize_drag_segment.png" class="gif-border" />
</center>
    <i>Figure 18: Resize the audio segment.</i>

The **Segment details** pane is located on the right side of the following figure. 
<center>
<img src="../images/audio-experience/segment_details_window.png" class="gif-border" />
</center>
    <i>Figure 19: Segment details pane.</i>

Besides using the slider, you can manually input the segment duration in the **Segment details** pane.
<center>
<img src="../images/audio-experience/input_segment_duration.png" class="gif-border" />
</center>
    <i>Figure 20: Input the segment duration.</i>

The region is displayed based on the manual input of the segment duration. 
<center>
<img src="../images/audio-experience/display_manual_segment_duration.png" class="gif-border" />
</center>
    <i>Figure 21: Display the manually set segment duration.</i>

#### Select multiple regions
Select multiple regions in the audio waveform by clicking on one or many regions. 
<center>
<img src="../images/audio-experience/select_multiple_regions.png" class="gif-border" />
</center>
    <i>Figure 22: Select multiple regions in the audio waveform.</i>

To change the duration of the selected regions, you can use the slider to move in the left or right direction, or manually edit the input of the start and end duration in the segment duration located in the **Segment details** pane. Now, the regions will scale across the segment duration. You can see the total duration of the selected segments in the interface. 
<center>
<img src="../images/audio-experience/total_duration_multiple_regions.png" class="gif-border" />
</center>
    <i>Figure 23: Total duration of multiple regions.</i>


## Audio Player controls 
The audio player provides the following controls: 
1. [Move playhead indicator](#move-playhead-indicator).
2. [Scroll across the timeline](#scroll-across-the-timeline).

### Move playhead indicator
To traverse through time, you can move the playhead to another time along the audio waveform or timeline by clicking on the head or tail, dragging to the desired location, and releasing the playhead. 

!!! attention "tip"
    - When you hold the playhead on the edge it will move the zoom and timeline along.
    - To forward in time, move the playhead to the right edge. 
    - To backward in time, move the playhead to the left edge. 
    - The zoom window and playhead indicator will follow along with the new positioning.

1. Select the playhead indicator.
<center>
<img src="../images/audio-experience/playhead_indicator.png" class="gif-border" />
</center>
    <i>Figure 24: Playhead indicator.</i>


2. Set the playhead to a specific location.
<center>
<img src="../images/audio-experience/playhead_move_specific_location.png" class="gif-border" />
</center>
    <i>Figure 25: Move the playhead to a specific location.</i>

### Scroll across the timeline
To scroll across the timeline, you can hover over the zoom window to click and drag the audio waveform to the desired location.

1. Scroll over the window.
<center>
<img src="../images/audio-experience/scroll_hover_window_timeline.png" class="gif-border" />
</center>
    <i>Figure 26: Hover the window timeline.</i>

2. Click and drag the window.
<center>
<img src="../images/audio-experience/click_drag_window_timeline.png" class="gif-border" />
</center>
    <i>Figure 27: Go to the window timeline.</i>

3. Move to a specific location in the timeline.
<center>
<img src="../images/audio-experience/move_specific_location_timeline.png" class="gif-border" />
</center>
    <i>Figure 28: Location in the timeline.</i>

### Zoom audio waveform
Resize the zoom controller to the desired level of detail. Zoom is indicated with the smaller audio waveform spanned across the audio zoom component. You can zoom in and out, both horizontally and vertically.

!!! note
    - There is a zoom controller that controls the audio waveform display.
    - The time duration updates when you adjust the width of the zoom controller. For example, when the zoom controller becomes narrower or wider it causes the timeline to shrink or expand.

You can do the following using the zoom audio waveform: 
- Move across the audio waveform using the track window.
- Change the size by zooming in and out of the audio.
- Click and drag the audio waveform. 


1. Zoom in the audio track 
<center>
<img src="../images/audio-experience/zoom_in_audio_player.png" class="gif-border" />
</center>
    <i>Figure 29: Zoom in.</i>

2. Zoom out the audio track 
<center>
<img src="../images/audio-experience/zoom_out_audio_player.png" class="gif-border" />
</center>
    <i>Figure 30: Zoom out.</i>

3. Select any region in the audio waveform to zoom in and out. 
<center>
<img src="../images/audio-experience/select_region_audio_player.png" class="gif-border" />
</center>
    <i>Figure 31: Zoom in and out of any region.</i>

### Play a selected segment or region
To play a selected segment or region, press the play button or hotkey which loops the playback for the timeframe determined by the selection. 

!!! note 
    - The timestamp in the audio player shows where the playhead indicator is placed.
    - The audio player's settings (playback speed and volume) affect the segmentation playback. 

1. Click the play button to play the audio waveform from selected segments. 
<center>
<img src="../images/audio-experience/play_begin_overlapped_regions.png" class="gif-border" />
</center>
    <i>Figure 32: Start playing from the selected segments.</i>

2. Pause the playback if required. 
<center>
<img src="../images/audio-experience/play_start_overlapped_regions.png" class="gif-border" />
</center>
    <i>Figure 33: Pause the audioform.</i>

The audio waveform playback is completed when the playhead reaches the end of the duration in the selected segment or region. 
<center>
<img src="../images/audio-experience/play_complete_overlapped_regions.png" class="gif-border" />
</center>
    <i>Figure 34: Completed the audio waveform.</i>

### Audio Player settings

!!! attention "important"
    In the audio player components, custom input values must be whole numbers and should be at most the maximum for all sliders and input text boxes.

Use the **Settings** menu to change the functionality of the feature. 

#### Adjust the playback speed
You can adjust the playback speed by clicking on the **Playback speed** from the **Settings** menu. Now, select a pre-determined integer value or custom input. 

!!! note 
    The speed settings are increased or decreased by 50. 

<center>
<img src="../images/audio-experience/default_playback_speed.png" class="gif-border" />
</center>
    <i>Figure 35: Default playback speed.</i>

You cannot input decimal numbers to change the playback speed. 
<center>
<img src="../images/audio-experience/playback_speed_input_error.png" class="gif-border" />
</center>
    <i>Figure 36: Playback speed input error.</i>

#### Zoom the audio y-axis 
Zoom into the audio waveform vertically by adjusting the slider to the desired value so that it is easier to determine where silence is present in the audio waveform. This results in updating the peaks and valleys of the audio waveform. 
<center>
<img src="../images/audio-experience/zoom_yaxis_audio_playback.png" class="gif-border" />
</center>
    <i>Figure 37: Zoom the audio y-axis.</i>

#### Show or hide components 
Show or hide the following components of the audio player by clicking on the specific menu item from the **Settings** menu.

**Hide timeline** 
<center>
<img src="../images/audio-experience/hide_timeline.png" class="gif-border" />
</center>
    <i>Figure 38: Show or hide timeline.</i>

<center>
<img src="../images/audio-experience/hidden_timeline_audio_wave.png" class="gif-border" />
</center>
    <i>Figure 39: Timeline is hidden.</i>

**Hide audio wave**
<center>
<img src="../images/audio-experience/hide_audio_wave.png" class="gif-border" />
</center>
    <i>Figure 40: Show or hide audio wave.</i>

<center>
<img src="../images/audio-experience/hidden_audio_wave.png" class="gif-border" />
</center>
    <i>Figure 41: Audio wave is hidden.</i>

**Hide audio track** 
<center>
<img src="../images/audio-experience/hide_audio_player.png" class="gif-border" />
</center>
    <i>Figure 42: Show or hide audio track.</i>

### Volume Settings 
#### Adjust the volume
Adjust the volume by selecting a pre-determined integer value or custom input by clicking the volume button in the toolbar. Now, you can use the slider or enter a value in the textbox to change the volume.
<center>
<img src="../images/audio-experience/volume_settings.png" class="gif-border" />
</center>
    <i>Figure 43: Volume settings.</i>


#### Mute playback audio
Mute the playback audio/volume by clicking the **Mute** button or set the value to zero percent on the slider either by input or by clicking and dragging the thumb to the zero value on the track. When muted the icon will display muted volume.
<center>
<img src="../images/audio-experience/mute_volume.png" class="gif-border" />
</center>
    <i>Figure 44: Mute playback audio.</i>

The custom input values must be whole numbers and should be at most the maximum for all sliders and input text boxes. The following figure shows an example of incorrect custom input values for volume settings. 
<center>
<img src="../images/audio-experience/volume_input_error.png" class="gif-border" />
</center>
    <i>Figure 45: Input error for volume settings. </i>
