### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | URL of the video |
| [frameRate] | <code>number</code> | <code>24</code> | video frame rate per second; default is 24; can use task data like `$fps` |
| [sync] | <code>string</code> |  | object name to sync with |
| [muted] | <code>boolean</code> | <code>false</code> | muted video |
| [height] | <code>number</code> | <code>600</code> | height of the video player |
| [timelineHeight] | <code>number</code> |  | explicit height of the timeline with regions in pixels; defaults to 20vh, clamped to 144-320px |
| [defaultPlaybackSpeed] | <code>number</code> | <code>1</code> | default playback speed the player should start with when loaded |
| [minPlaybackSpeed] | <code>number</code> | <code>1</code> | minimum allowed playback speed; defaultPlaybackSpeed cannot be set below this value |

