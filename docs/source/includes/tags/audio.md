### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing path or a URL to the audio. |
| [defaultspeed] | <code>string</code> | <code>1</code> | Default speed level (from 0.5 to 2). |
| [defaultscale] | <code>string</code> | <code>1</code> | Audio pane default y-scale for waveform. |
| [defaultzoom] | <code>string</code> | <code>1</code> | Default zoom level for waveform. (from 1 to 1500). |
| [defaultvolume] | <code>string</code> | <code>1</code> | Default volume level (from 0 to 1). |
| [hotkey] | <code>string</code> |  | Hotkey used to play or pause audio. |
| [sync] | <code>string</code> |  | Object name to sync with. |
| [height] | <code>string</code> | <code>96</code> | Total height of the audio player. |
| [waveheight] | <code>string</code> | <code>32</code> | Minimum height of a waveform when in `splitchannels` mode with multiple channels to display. |
| [spectrogram] | <code>boolean</code> | <code>false</code> | Determines whether an audio spectrogram is automatically displayed upon loading. |
| [splitchannels] | <code>boolean</code> | <code>false</code> | Display multiple audio channels separately, if the audio file has more than one channel. (**NOTE: Requires more memory to operate.**) |
| [decoder] | <code>string</code> | <code>&quot;webaudio&quot;</code> | Decoder type to use to decode audio data. (`"webaudio"`, `"ffmpeg"`, or `"none"` for no decoding - provides fast loading for large files but disables waveform visualization) |
| [player] | <code>string</code> | <code>&quot;html5&quot;</code> | Player type to use to play audio data. (`"html5"` or `"webaudio"`) |

### Result parameters

| Name | Type | Description |
| --- | --- | --- |
| original_length | <code>number</code> | length of the original audio (seconds) |
| value | <code>Object</code> |  |
| value.start | <code>number</code> | start time of the fragment (seconds) |
| value.end | <code>number</code> | end time of the fragment (seconds) |
| value.channel | <code>number</code> | channel identifier which was targeted |

### Example JSON
```json
{
  "original_length": 18,
  "value": {
    "start": 3.1,
    "end": 8.2,
    "channel": 0,
    "labels": ["Voice"]
  }
}
```

