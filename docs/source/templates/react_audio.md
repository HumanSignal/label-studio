---
title: Multi-Channel Audio Transcription
type: templates
category: Programmable Interfaces
order: 753
is_new: t
meta_title: Template for multi-channel audio transcription
meta_description: Template that uses a custom UI to visualize and transcribe multiple audio channels 
---

This template creates an interface for transcribing and editing multi-speaker audio conversations. It combines synchronized audio playback, visual transcript display, and an advanced editing interface to streamline the transcription workflow.

The example labeling configuration creates a split-screen interface with:

- **Dual audio players** for two speakers with synchronized playback controls
- **Visual transcript display** showing the dialogue in a conversation-style layout
- **Advanced transcription editor** with full editing capabilities including text modification, segment splitting, insertion, deletion, and time adjustment


![Screenshot](/images/templates-misc/react-audio.png)

!!! error Enterprise
    This template and the `ReactCode` tag can only be used in Label Studio Enterprise.

    For more information, including simplified code examples, see [ReactCode](/tags/reactcode).

## Labeling configuration

This example uses three main Label Studio components working together:

1. **Audio Tags** (`<Audio>`) - Display two audio players that can be synchronized using the spacebar hotkey. Each player is linked to its respective speaker's audio file.

2. **Paragraphs Tag** (`<Paragraphs>`) - Renders the transcript in a dialogue format, automatically synchronized with the audio playback. It displays speaker names and text segments in a scrollable view.

3. **ReactCode Component** - Provides a custom React-based editor that allows annotators to:
   - Edit transcription text for any segment
   - Change speaker assignments
   - Adjust start and end times (supports seconds or MM:SS format)
   - Split segments at specific character positions and times
   - Insert new segments between existing ones
   - Delete segments with automatic reindexing
   - Undo changes with a history system
   - Synchronize scrolling between the transcript view and editor

The transcript data is stored as an array of segment objects, each containing `speaker`, `start`, `end`, and `text` fields. The `ReactCode` component manages this data structure and persists changes through Label Studio's region API.

{% details <b>Click to expand</b> %}
```xml
<View>
  <Header value="Audio Transcription with Paragraphs"/>
  
  <View style="display: flex; flex-direction: row; gap: 20px; margin-bottom: 20px; position: sticky; top: 0; z-index: 100; background-color: white; padding: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <View style="flex: 1;">
      <Header value="Speaker 1 Audio"/>
      <Audio name="audio_speaker_1" value="$audio_speaker_1" height="200" hotkey="space" sync="text" />
      <Labels name="speaker_1_labels" toName="audio_speaker_1">
        <Label value="Speaker 1" background="blue"/>
      </Labels>
    </View>
    
    <View style="flex: 1;">
      <Header value="Speaker 2 Audio"/>
      <Audio name="audio_speaker_2" value="$audio_speaker_2" height="200" hotkey="space" sync="text" />
      <Labels name="speaker_2_labels" toName="audio_speaker_2">
        <Label value="Speaker 2" background="green"/>
      </Labels>
    </View>
  </View>
  
  <View style="display: flex; flex-direction: row; gap: 20px; height: 700px;">
    <View style="flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column;">
      <Header value="Transcript"/>
      <View id="transcript-scroll-container" style="flex: 1; min-height: 0; overflow: auto;">
        <Paragraphs audioUrl="$audio_speaker_1"
                    sync="audio_speaker_1"
                    name="text"
                    value="$transcript"
                    layout="dialogue"
                    textKey="text"
                    nameKey="speaker"
                    granularity="paragraph"/>
      </View>
    </View>
    
    <View style="flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column;">
      <Header value="Edit Transcriptions"/>
      <ReactCode name="transcription_editor" toName="transcription_editor" data="$transcript" style="flex: 1; min-height: 0;">
  <![CDATA[
({ React, data, regions, addRegion }) => {
  const [segments, setSegments] = React.useState([]);
  const [editedSegments, setEditedSegments] = React.useState({});
  const [newSegment, setNewSegment] = React.useState({
    speaker: 'Speaker 1',
    start: '',
    end: '',
    text: ''
  });
  const [splitSegmentIndex, setSplitSegmentIndex] = React.useState(null);
  const [splitPosition, setSplitPosition] = React.useState('');
  const [splitTime, setSplitTime] = React.useState('');
  const [insertAfterIndex, setInsertAfterIndex] = React.useState(null);
  const [undoHistory, setUndoHistory] = React.useState([]);
  const [timeInputs, setTimeInputs] = React.useState({}); // Store raw time input values

  // Parse transcript data
  React.useEffect(() => {
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (Array.isArray(parsedData)) {
        setSegments(parsedData);
        // Initialize edited segments with original text
        const initialEdited = {};
        parsedData.forEach((seg, idx) => {
          initialEdited[idx] = seg.text || '';
        });
        setEditedSegments(initialEdited);
      }
    } catch (e) {
      console.error('Error parsing transcript data:', e);
    }
  }, [data]);

  // Load edited segments from regions if they exist
  React.useEffect(() => {
    if (regions && regions.length > 0 && regions[0] && regions[0].value) {
      const regionValue = regions[0].value;
      if (regionValue.editedSegments) {
        setEditedSegments(regionValue.editedSegments);
      }
      if (regionValue.segments && Array.isArray(regionValue.segments)) {
        setSegments(regionValue.segments);
      }
    }
  }, [regions]);

  // Save segments to regions
  const saveSegments = (updatedSegments, updatedEdited) => {
    if (regions && regions.length > 0 && regions[0]) {
      regions[0].update({
        segments: updatedSegments,
        editedSegments: updatedEdited
      });
    } else {
      addRegion({
        segments: updatedSegments,
        editedSegments: updatedEdited
      });
    }
  };

  // Update segment text
  const updateSegmentText = (segmentIndex, newText) => {
    setEditedSegments(prev => {
      const updated = { ...prev, [segmentIndex]: newText };
      
      // Save to regions
      const updatedSegments = segments.map((seg, idx) => ({
        ...seg,
        text: updated[idx] !== undefined ? updated[idx] : seg.text
      }));
      
      saveSegments(updatedSegments, updated);
      
      return updated;
    });
  };

  // Update segment speaker
  const updateSegmentSpeaker = (segmentIndex, newSpeaker) => {
    const updatedSegments = segments.map((seg, idx) => 
      idx === segmentIndex ? { ...seg, speaker: newSpeaker } : seg
    );
    setSegments(updatedSegments);
    saveSegments(updatedSegments, editedSegments);
  };

  // Update segment time
  const updateSegmentTime = (segmentIndex, timeType, newTime) => {
    const parsedTime = parseTimeInput(newTime);
    const timeValue = parsedTime ? parseFloat(parsedTime) : 0;
    const updatedSegments = segments.map((seg, idx) => 
      idx === segmentIndex ? { ...seg, [timeType]: timeValue } : seg
    );
    setSegments(updatedSegments);
    saveSegments(updatedSegments, editedSegments);
    // Clear the raw input value after updating
    const inputKey = `${segmentIndex}-${timeType}`;
    setTimeInputs(prev => {
      const updated = { ...prev };
      delete updated[inputKey];
      return updated;
    });
  };

  // Delete segment
  const deleteSegment = (segmentIndex) => {
    // Save to history before deleting
    saveToHistory();
    
    const updatedSegments = segments.filter((_, idx) => idx !== segmentIndex);
    const updatedEdited = {};
    // Reindex edited segments: indices before segmentIndex stay the same, indices after shift down by 1
    updatedSegments.forEach((seg, newIdx) => {
      const originalIdx = newIdx < segmentIndex ? newIdx : newIdx + 1;
      if (editedSegments[originalIdx] !== undefined) {
        updatedEdited[newIdx] = editedSegments[originalIdx];
      } else {
        updatedEdited[newIdx] = seg.text || '';
      }
    });
    setSegments(updatedSegments);
    setEditedSegments(updatedEdited);
    saveSegments(updatedSegments, updatedEdited);
  };

  // Undo function
  const undo = () => {
    if (undoHistory.length === 0) return;
    
    const lastState = undoHistory[undoHistory.length - 1];
    setSegments(lastState.segments);
    setEditedSegments(lastState.editedSegments);
    setUndoHistory(undoHistory.slice(0, -1));
    saveSegments(lastState.segments, lastState.editedSegments);
  };

  // Save state to history before split or insert
  const saveToHistory = () => {
    setUndoHistory([...undoHistory, {
      segments: [...segments],
      editedSegments: { ...editedSegments }
    }]);
  };

  // Split segment at a specific position
  const splitSegment = (segmentIndex, splitPos) => {
    const segment = segments[segmentIndex];
    const editedText = editedSegments[segmentIndex] !== undefined ? editedSegments[segmentIndex] : segment.text || '';
    
    if (!splitPos || splitPos <= 0 || splitPos >= editedText.length) {
      alert('Please enter a valid split position (between 0 and text length)');
      return;
    }

    const parsedSplitTime = parseFloat(parseTimeInput(splitTime || ''));
    if (isNaN(parsedSplitTime) || parsedSplitTime <= segment.start || parsedSplitTime >= segment.end) {
      alert('Split time must be between segment start and end times');
      return;
    }

    const textBefore = editedText.substring(0, splitPos).trim();
    const textAfter = editedText.substring(splitPos).trim();

    if (!textBefore || !textAfter) {
      alert('Split position must create two non-empty segments');
      return;
    }

    // Save to history before splitting
    saveToHistory();

    // Create two segments
    const firstSegment = {
      ...segment,
      start: segment.start,
      end: parsedSplitTime,
      text: textBefore
    };

    const secondSegment = {
      ...segment,
      start: parsedSplitTime,
      end: segment.end,
      text: textAfter
    };

    // Insert the split segments
    const updatedSegments = [
      ...segments.slice(0, segmentIndex),
      firstSegment,
      secondSegment,
      ...segments.slice(segmentIndex + 1)
    ];

    // Reindex edited segments
    const reindexedEdited = {};
    updatedSegments.forEach((seg, idx) => {
      if (idx === segmentIndex) {
        reindexedEdited[idx] = textBefore;
      } else if (idx === segmentIndex + 1) {
        reindexedEdited[idx] = textAfter;
      } else {
        const oldIdx = idx < segmentIndex ? idx : idx > segmentIndex + 1 ? idx - 1 : idx;
        if (editedSegments[oldIdx] !== undefined) {
          reindexedEdited[idx] = editedSegments[oldIdx];
        } else {
          reindexedEdited[idx] = seg.text || '';
        }
      }
    });

    setSegments(updatedSegments);
    setEditedSegments(reindexedEdited);
    saveSegments(updatedSegments, reindexedEdited);
    setSplitSegmentIndex(null);
    setSplitPosition('');
    setSplitTime('');
  };

  // Insert segment after a specific index
  const insertSegmentAfter = (afterIndex) => {
    const currentSegment = segments[afterIndex];
    const nextSegment = segments[afterIndex + 1];
    
    // Calculate default times (midpoint between current end and next start, or current end + 1 second)
    const defaultStart = currentSegment.end;
    const defaultEnd = nextSegment ? 
      ((currentSegment.end + nextSegment.start) / 2) : 
      (currentSegment.end + 1);
    
    setInsertAfterIndex(afterIndex);
    setNewSegment({
      speaker: currentSegment.speaker,
      start: defaultStart.toString(),
      end: defaultEnd.toString(),
      text: ''
    });
  };

  // Modified addNewSegment to handle insert after
  const addNewSegmentWithIndex = (insertAtIndex) => {
    if (!newSegment.text.trim() || !newSegment.start || !newSegment.end) {
      alert('Please fill in all fields (speaker, start time, end time, and text)');
      return;
    }

    const startTimeStr = parseTimeInput(newSegment.start);
    const endTimeStr = parseTimeInput(newSegment.end);
    
    if (!startTimeStr || !endTimeStr) {
      alert('Please enter valid time values (seconds or MM:SS format)');
      return;
    }

    const startTime = parseFloat(startTimeStr) || 0;
    const endTime = parseFloat(endTimeStr) || 0;

    if (endTime <= startTime) {
      alert('End time must be greater than start time');
      return;
    }

    // Save to history before inserting
    saveToHistory();

    const newSeg = {
      speaker: newSegment.speaker,
      start: startTime,
      end: endTime,
      text: newSegment.text.trim()
    };

    // Insert at specific index if provided, otherwise use chronological order
    let insertIndex;
    if (insertAtIndex !== null && insertAtIndex !== undefined) {
      insertIndex = insertAtIndex + 1;
    } else {
      insertIndex = segments.findIndex(seg => seg.start > startTime);
      if (insertIndex === -1) insertIndex = segments.length;
    }

    const updatedSegments = [
      ...segments.slice(0, insertIndex),
      newSeg,
      ...segments.slice(insertIndex)
    ];
    
    // Reindex edited segments
    const reindexedEdited = {};
    updatedSegments.forEach((seg, idx) => {
      if (idx === insertIndex) {
        reindexedEdited[idx] = newSeg.text;
      } else {
        const oldIdx = idx < insertIndex ? idx : idx - 1;
        if (editedSegments[oldIdx] !== undefined) {
          reindexedEdited[idx] = editedSegments[oldIdx];
        } else {
          reindexedEdited[idx] = seg.text || '';
        }
      }
    });

    setSegments(updatedSegments);
    setEditedSegments(reindexedEdited);
    saveSegments(updatedSegments, reindexedEdited);
    
    // Reset form
    setNewSegment({ speaker: 'Speaker 1', start: '', end: '', text: '' });
    setInsertAfterIndex(null);
  };

  // Parse time input (supports MM:SS or seconds)
  const parseTimeInput = (input) => {
    if (!input || input.trim() === '') return '';
    
    const trimmed = input.trim();
    
    // Handle MM:SS format
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length === 2) {
        const mins = parseFloat(parts[0]) || 0;
        const secs = parseFloat(parts[1]) || 0;
        // Handle cases like "1:5" (should be 1:05) or "1:65" (should be 2:05)
        const totalSeconds = mins * 60 + secs;
        return totalSeconds.toString();
      }
      // If malformed (e.g., just "1:"), try to parse as number
      const numValue = parseFloat(trimmed.replace(':', ''));
      if (!isNaN(numValue)) {
        return numValue.toString();
      }
      return '';
    }
    
    // Handle plain number (seconds)
    const numValue = parseFloat(trimmed);
    if (!isNaN(numValue)) {
      return numValue.toString();
    }
    
    return '';
  };

  // Format time for display
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Container style
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
    boxSizing: 'border-box',
    position: 'relative'
  };

  // Fixed header style for undo button
  const fixedHeaderStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backgroundColor: '#f5f5f5',
    padding: '15px',
    paddingBottom: '10px',
    borderBottom: '2px solid #ddd',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  // Content area style (scrollable)
  const contentStyle = {
    flex: 1,
    overflow: 'auto',
    padding: '15px',
    paddingTop: '10px'
  };

  // Scroll synchronization refs
  const transcriptScrollRef = React.useRef(null);
  const editorScrollRef = React.useRef(null);
  const isScrollingRef = React.useRef(false);

  // Set up scroll synchronization
  React.useEffect(() => {
    // Find the actual scrollable transcript container
    const findScrollableElement = (element) => {
      if (!element) return null;
      
      // Check if this element is scrollable
      const style = window.getComputedStyle(element);
      const isScrollable = (
        (style.overflow === 'auto' || style.overflow === 'scroll' || 
         style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        element.scrollHeight > element.clientHeight
      );
      
      if (isScrollable) {
        return element;
      }
      
      // Check children
      for (let child of element.children) {
        const scrollable = findScrollableElement(child);
        if (scrollable) return scrollable;
      }
      
      return element; // Fallback to the element itself
    };

    const transcriptContainerElement = document.getElementById('transcript-scroll-container');
    const scrollableTranscript = findScrollableElement(transcriptContainerElement);
    const editorContainer = editorScrollRef.current;

    if (!scrollableTranscript || !editorContainer) return;

    const syncScroll = (source, target, sourceScrollTop, sourceScrollHeight, sourceClientHeight) => {
      if (isScrollingRef.current) return;
      
      isScrollingRef.current = true;
      
      const sourceMaxScroll = sourceScrollHeight - sourceClientHeight;
      if (sourceMaxScroll <= 0) {
        isScrollingRef.current = false;
        return;
      }
      
      const sourceScrollRatio = sourceScrollTop / sourceMaxScroll;
      const targetScrollHeight = target.scrollHeight;
      const targetClientHeight = target.clientHeight;
      const targetMaxScroll = targetScrollHeight - targetClientHeight;
      
      if (targetMaxScroll > 0) {
        target.scrollTop = sourceScrollRatio * targetMaxScroll;
      }
      
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 10);
    };

    const handleTranscriptScroll = (e) => {
      const container = e.target;
      syncScroll(
        container,
        editorContainer,
        container.scrollTop,
        container.scrollHeight,
        container.clientHeight
      );
    };

    const handleEditorScroll = (e) => {
      const container = e.target;
      syncScroll(
        container,
        scrollableTranscript,
        container.scrollTop,
        container.scrollHeight,
        container.clientHeight
      );
    };

    scrollableTranscript.addEventListener('scroll', handleTranscriptScroll, { passive: true });
    editorContainer.addEventListener('scroll', handleEditorScroll, { passive: true });

    return () => {
      scrollableTranscript.removeEventListener('scroll', handleTranscriptScroll);
      editorContainer.removeEventListener('scroll', handleEditorScroll);
    };
  }, []);

  // Segment container style
  const segmentContainerStyle = {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #ddd'
  };

  // Header style
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '14px',
    color: '#666'
  };

  // Textarea style
  const textareaStyle = {
    width: '100%',
    minHeight: '60px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box'
  };

  // Input style
  const inputStyle = {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  };

  // Select style
  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  // Button style
  const buttonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    backgroundColor: '#1976d2',
    color: 'white',
    transition: 'background-color 0.2s'
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#d32f2f',
    padding: '4px 8px',
    fontSize: '12px'
  };

  // Speaker badge style
  const speakerBadgeStyle = (speaker) => ({
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: speaker === 'Speaker 1' ? '#e3f2fd' : '#e8f5e9',
    color: speaker === 'Speaker 1' ? '#1976d2' : '#388e3c',
    marginRight: '10px'
  });

  return React.createElement('div', { style: containerStyle },
    React.createElement('div', { style: fixedHeaderStyle },
      React.createElement('h2', { style: { marginTop: 0, marginBottom: 0 } }, 'Edit Transcription Segments'),
      undoHistory.length > 0 && React.createElement('button', {
        onClick: undo,
        style: { ...buttonStyle, backgroundColor: '#757575' },
        onMouseOver: (e) => e.target.style.backgroundColor = '#616161',
        onMouseOut: (e) => e.target.style.backgroundColor = '#757575'
      }, 'Undo')
    ),

    React.createElement('div', { 
      ref: editorScrollRef,
      style: contentStyle 
    },
      segments.length === 0 ? 
        React.createElement('div', { style: { color: '#666', padding: '20px', textAlign: 'center' } },
          'No transcription segments available. Please ensure transcript data is loaded.'
        ) :
        segments.map((segment, index) => {
        const editedText = editedSegments[index] !== undefined ? editedSegments[index] : segment.text || '';
        
        return React.createElement('div', {
          key: index,
          style: segmentContainerStyle
        },
          React.createElement('div', { style: headerStyle },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              React.createElement('select', {
                value: segment.speaker || 'Speaker 1',
                onChange: (e) => updateSegmentSpeaker(index, e.target.value),
                style: { ...selectStyle, width: 'auto', padding: '4px 8px' }
              },
                React.createElement('option', { value: 'Speaker 1' }, 'Speaker 1'),
                React.createElement('option', { value: 'Speaker 2' }, 'Speaker 2')
              ),
              React.createElement('span', { style: speakerBadgeStyle(segment.speaker) }, segment.speaker || 'Unknown'),
              React.createElement('span', { style: { fontWeight: 'bold' } }, `Segment ${index + 1}`)
            ),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
              React.createElement('div', { style: { display: 'flex', gap: '5px', alignItems: 'center' } },
                React.createElement('input', {
                  type: 'text',
                  value: timeInputs[`${index}-start`] !== undefined 
                    ? timeInputs[`${index}-start`] 
                    : formatTime(segment.start),
                  onChange: (e) => {
                    const inputKey = `${index}-start`;
                    setTimeInputs(prev => ({ ...prev, [inputKey]: e.target.value }));
                  },
                  onBlur: (e) => {
                    updateSegmentTime(index, 'start', e.target.value);
                  },
                  onKeyDown: (e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  },
                  style: { ...inputStyle, width: '80px', padding: '4px 8px', fontSize: '12px' },
                  placeholder: '0:00'
                }),
                React.createElement('span', null, '-'),
                React.createElement('input', {
                  type: 'text',
                  value: timeInputs[`${index}-end`] !== undefined 
                    ? timeInputs[`${index}-end`] 
                    : formatTime(segment.end),
                  onChange: (e) => {
                    const inputKey = `${index}-end`;
                    setTimeInputs(prev => ({ ...prev, [inputKey]: e.target.value }));
                  },
                  onBlur: (e) => {
                    updateSegmentTime(index, 'end', e.target.value);
                  },
                  onKeyDown: (e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  },
                  style: { ...inputStyle, width: '80px', padding: '4px 8px', fontSize: '12px' },
                  placeholder: '0:00'
                })
              ),
              React.createElement('button', {
                onClick: () => {
                  if (splitSegmentIndex === index) {
                    setSplitSegmentIndex(null);
                    setSplitPosition('');
                    setSplitTime('');
                  } else {
                    setSplitSegmentIndex(index);
                    setSplitPosition('');
                    setSplitTime(formatTime((segment.start + segment.end) / 2));
                  }
                },
                style: { ...buttonStyle, backgroundColor: '#ff9800', padding: '4px 8px', fontSize: '12px' },
                onMouseOver: (e) => e.target.style.backgroundColor = '#f57c00',
                onMouseOut: (e) => e.target.style.backgroundColor = '#ff9800'
              }, splitSegmentIndex === index ? 'Cancel Split' : 'Split'),
              React.createElement('button', {
                onClick: () => {
                  if (insertAfterIndex === index) {
                    setInsertAfterIndex(null);
                    setNewSegment({ speaker: 'Speaker 1', start: '', end: '', text: '' });
                  } else {
                    insertSegmentAfter(index);
                  }
                },
                style: { ...buttonStyle, backgroundColor: '#9c27b0', padding: '4px 8px', fontSize: '12px' },
                onMouseOver: (e) => e.target.style.backgroundColor = '#7b1fa2',
                onMouseOut: (e) => e.target.style.backgroundColor = '#9c27b0'
              }, insertAfterIndex === index ? 'Cancel Insert' : 'Insert After'),
              React.createElement('button', {
                onClick: () => deleteSegment(index),
                style: deleteButtonStyle,
                onMouseOver: (e) => e.target.style.backgroundColor = '#b71c1c',
                onMouseOut: (e) => e.target.style.backgroundColor = '#d32f2f'
              }, 'Delete')
            )
          ),
          React.createElement('textarea', {
            value: editedText,
            onChange: (e) => updateSegmentText(index, e.target.value),
            style: textareaStyle,
            placeholder: 'Enter transcription text...',
            rows: 3,
            onSelect: (e) => {
              if (splitSegmentIndex === index) {
                const textarea = e.target;
                const cursorPos = textarea.selectionStart;
                setSplitPosition(cursorPos.toString());
                // Estimate split time based on character position (proportional)
                if (editedText.length > 0) {
                  const ratio = cursorPos / editedText.length;
                  const estimatedTime = segment.start + (segment.end - segment.start) * ratio;
                  setSplitTime(formatTime(estimatedTime));
                }
              }
            }
          }          ),
          insertAfterIndex === index && React.createElement('div', {
            style: {
              ...segmentContainerStyle,
              marginTop: '10px',
              border: '2px solid #9c27b0',
              backgroundColor: '#f3e5f5'
            }
          },
            React.createElement('h4', { style: { marginTop: 0, marginBottom: '15px', color: '#6a1b9a' } }, 'Insert New Segment After This'),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                React.createElement('div', { style: { flex: 1 } },
                  React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' } }, 'Speaker'),
                  React.createElement('select', {
                    value: newSegment.speaker,
                    onChange: (e) => setNewSegment({ ...newSegment, speaker: e.target.value }),
                    style: selectStyle
                  },
                    React.createElement('option', { value: 'Speaker 1' }, 'Speaker 1'),
                    React.createElement('option', { value: 'Speaker 2' }, 'Speaker 2')
                  )
                ),
                React.createElement('div', { style: { flex: 1 } },
                  React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' } }, 'Start Time (seconds or MM:SS)'),
                  React.createElement('input', {
                    type: 'text',
                    value: newSegment.start,
                    onChange: (e) => setNewSegment({ ...newSegment, start: e.target.value }),
                    style: inputStyle,
                    placeholder: '0 or 0:00'
                  })
                ),
                React.createElement('div', { style: { flex: 1 } },
                  React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' } }, 'End Time (seconds or MM:SS)'),
                  React.createElement('input', {
                    type: 'text',
                    value: newSegment.end,
                    onChange: (e) => setNewSegment({ ...newSegment, end: e.target.value }),
                    style: inputStyle,
                    placeholder: '0 or 0:00'
                  })
                )
              ),
              React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' } }, 'Text'),
                React.createElement('textarea', {
                  value: newSegment.text,
                  onChange: (e) => setNewSegment({ ...newSegment, text: e.target.value }),
                  style: textareaStyle,
                  placeholder: 'Enter transcription text...',
                  rows: 3
                })
              ),
              React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                React.createElement('button', {
                  onClick: () => addNewSegmentWithIndex(insertAfterIndex),
                  style: buttonStyle,
                  onMouseOver: (e) => e.target.style.backgroundColor = '#1565c0',
                  onMouseOut: (e) => e.target.style.backgroundColor = '#1976d2'
                }, 'Insert Segment'),
                React.createElement('button', {
                  onClick: () => {
                    setInsertAfterIndex(null);
                    setNewSegment({ speaker: 'Speaker 1', start: '', end: '', text: '' });
                  },
                  style: { ...buttonStyle, backgroundColor: '#757575' },
                  onMouseOver: (e) => e.target.style.backgroundColor = '#616161',
                  onMouseOut: (e) => e.target.style.backgroundColor = '#757575'
                }, 'Cancel')
              )
            )
          ),
          splitSegmentIndex === index && React.createElement('div', {
            style: {
              ...segmentContainerStyle,
              marginTop: '10px',
              border: '2px solid #ff9800',
              backgroundColor: '#fff3e0'
            }
          },
            React.createElement('h4', { style: { marginTop: 0, marginBottom: '10px', color: '#e65100' } }, 'Split Segment'),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              React.createElement('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
                React.createElement('div', { style: { flex: 1 } },
                  React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' } }, 'Split Position (character index)'),
                  React.createElement('input', {
                    type: 'number',
                    value: splitPosition,
                    onChange: (e) => setSplitPosition(e.target.value),
                    style: inputStyle,
                    placeholder: 'Click in text above or enter position',
                    min: 1,
                    max: editedText.length
                  })
                ),
                React.createElement('div', { style: { flex: 1 } },
                  React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' } }, 'Split Time (seconds or MM:SS)'),
                  React.createElement('input', {
                    type: 'text',
                    value: splitTime || formatTime((segment.start + segment.end) / 2),
                    onChange: (e) => setSplitTime(e.target.value),
                    style: inputStyle,
                    placeholder: 'Time at split point'
                  })
                )
              ),
              React.createElement('div', { style: { fontSize: '12px', color: '#666', fontStyle: 'italic' } },
                'Tip: Click in the text above to set split position, or enter character position and time manually'
              ),
              React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                React.createElement('button', {
                  onClick: () => {
                    const pos = parseInt(splitPosition);
                    if (isNaN(pos)) {
                      alert('Please enter a valid character position');
                      return;
                    }
                    splitSegment(index, pos);
                  },
                  style: { ...buttonStyle, backgroundColor: '#ff9800' },
                  onMouseOver: (e) => e.target.style.backgroundColor = '#f57c00',
                  onMouseOut: (e) => e.target.style.backgroundColor = '#ff9800'
                }, 'Split Segment'),
                React.createElement('button', {
                  onClick: () => {
                    setSplitSegmentIndex(null);
                    setSplitPosition('');
                    setSplitTime('');
                  },
                  style: { ...buttonStyle, backgroundColor: '#757575' },
                  onMouseOver: (e) => e.target.style.backgroundColor = '#616161',
                  onMouseOut: (e) => e.target.style.backgroundColor = '#757575'
                }, 'Cancel')
              )
            )
          )
        );
      })
    )
  );
}
  ]]>
      </ReactCode>
    </View>
  </View>
</View>
```

{% enddetails %}

## Example input

Copy this into a JSON file and then import it into a project with the example code above. 

{% details <b>Click to expand</b> %}

```json
{
  "data": {
    "audio_speaker_1": "/static/samples/opossum-talk-1.mp3",
    "audio_speaker_2": "/static/samples/opossum-talk-2.mp3",
    "transcript": [
      {
        "speaker": "Speaker 1",
        "start": 0.0,
        "end": 8.4,
        "text": "You know, I feel like opossums are seriously underrated. People see them once and assume the worst, but they're actually kind of amazing."
      },
      {
        "speaker": "Speaker 2",
        "start": 9.2,
        "end": 18.345,
        "text": "I completely agree. I used to be scared of them, but once I learned how much they help the environment, I totally changed my mind. They eat so many ticks."
      },
      {
        "speaker": "Speaker 1",
        "start": 19.545,
        "end": 27.865,
        "text": "Exactly. They're like tiny cleanup crews. They eat insects, leftover food, even things that could attract pests if they were left lying around."
      },
      {
        "speaker": "Speaker 2",
        "start": 29.369999,
        "end": 37.53,
        "text": "And they're really not aggressive at all. Most of the time, they're just trying to mind their own business and survive in areas that humans have taken over."
      },
      {
        "speaker": "Speaker 1",
        "start": 38.57,
        "end": 50.895,
        "text": "That's why I think one of the best things we can do is make our neighborhood safer for them. Simple stuff, like driving more carefully at night or securing trash cans so they're not tempted into dangerous spots."
      },
      {
        "speaker": "Speaker 2",
        "start": 52.015,
        "end": 60.089996,
        "text": "Yeah. And leaving natural shelter helps too. Brush piles, fallen logs, or even designated wildlife boxes can give them a safe place to rest."
      },
      {
        "speaker": "Speaker 1",
        "start": 61.21,
        "end": 71.049995,
        "text": "Another big one is avoiding poisons. If we use fewer pesticides and rodenticides, opossums are less likely to get sick from eating contaminated prey."
      },
      {
        "speaker": "Speaker 2",
        "start": 72.345,
        "end": 82.105,
        "text": "Totally. Supporting local wildlife rehab centers is huge as well. They do incredible work rescuing injured opossums and educating people about why they matter."
      },
      {
        "speaker": "Speaker 1",
        "start": 83.145004,
        "end": 89.35,
        "text": "Honestly, the more people learn about opossums, the more they realize they're not pests. They're helpers."
      },
      {
        "speaker": "Speaker 2",
        "start": 90.310005,
        "end": 95.19,
        "text": "Exactly. Loving opossums is really just another way of taking better care of our local ecosystems."
      }
    ]
  }
}
```

{% enddetails %}

### Example output

The output will include all segments, which can then be compared with the original data. 

For example (partial JSON):

```json
      "result": [
        {
          "id": "dKlbp8y-o0",
          "type": "reactcode",
          "value": {
            "reactcode": {
              "segments": [
                {
                  "end": 8.4,
                  "text": "You know, I feel like opossums are seriously underrated. People see them once and assume the worst, but they're actually kind of amazing and pretty",
                  "start": 0,
                  "speaker": "Speaker 1"
                },
                ...
              ]
            }
          }
        }
      ]
```