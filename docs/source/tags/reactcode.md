---
title: ReactCode - Beta 🧪
short: ReactCode 🧪
type: tags
order: 307
meta_title: ReactCode tag
meta_description: Label Studio ReactCode tag for creating highly customized, programmable interfaces.
---

The `<ReactCode>` tag lets you embed a custom labeling UI inside Label Studio, while still storing outputs as regular Label Studio regions/results. 

You can use it to bring an external application that you have already created, or to create new custom annotation interfaces tailored to your specific use case. 

Importantly, this allows you to continue leveraging Label Studio's annotation management, review workflows, and data export capabilities.

!!! error Enterprise
    This tag is only available for Label Studio Enterprise users.

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| name | string | — | Unique identifier for the tag (required) |
| [toName] | string | — | If this is a [self-referencing tags ](#Self-referencing-tag), this parameter is required and should match `name` |
| [data] | string | — | The [task data](#Data-parameter), e.g., `data="$image"` or `data="$text"` |
| [inputs] | string | — | Defines the JSON schema for the input data (`data`)  |
| [outputs] | string | — | Defines the JSON schema for the [output](#Using-the-outputs-parameter)  |
| [style] | string | — | Inline styles or CSS string for the iframe container  |
| [classname] | string | — | Additional CSS classes for the wrapper  |

## ReactCode tag usage notes

The `ReactCode` tag is unique in several ways:

### Self-referencing tag

Unlike most other object tags, `ReactCode` can be used alone or with control tags.  

If you are not using it with control tags, you must make it self-referencing (the `toName` parameter must point to `name`). For example:
    
`<ReactCode name="react-app" toName="react-app">`

### Data parameter

Typically, you would use the `value` parameter to reference the task data. But for the `ReactCode` tag, you must use the `data` parameter instead. For example:

`<ReactCode name="react-app" toName="react-app" data="$image">`

You can then access task data from within your React code:

```javascript
function MyComponent({ React, addRegion, regions, data }) {
  // data contains the value from the task field specified in data="$fieldname"
  const imageUrl = data.image || data.image_url || data;
  const metadata = data.metadata || {};
  
  return React.createElement('img', { src: imageUrl });
}
```

## React usage notes

Before you begin, you should be familiar with React and React hooks (`useState`, `useEffect`, `useRef`). 

When building your React code, note the following: 

### CDATA wrapper

For complex code (especially when using `&`, `<`, `>` characters), wrap your code in `<![CDATA[` and `]]>` tags

```xml
<ReactCode name="custom" toName="custom" data="$myData">
  <![CDATA[
  // Your code here - safe from XML parsing issues
  function MyComponent({ React, addRegion, regions, data }) {
    // Code with &, <, > characters is safe here
  }
  ]]>
</ReactCode>
```

### No JSX support

JSX syntax is not available. You must use `React.createElement()` instead. 

```javascript
// ❌ This won't work
return <div className="container">Content</div>;

// ✅ Use this instead
return React.createElement('div', { className: 'container' }, 'Content');
```

### Function-based components

Your code must be a function that receives props and returns React elements. 

### Styling

You can use:
- **Tailwind CSS classes**: Pre-loaded in the iframe
- **Inline styles**: Via the `style` prop in `React.createElement()`
- **External CSS**: Load via CDN in your component


## Regions API

Your React component receives these props from Label Studio:

- **`React`**: React library with hooks (useState, useEffect, useRef, etc.)
- **`addRegion`**: Function to create new regions
- **`regions`**: Array of all existing regions for this tag
- **`data`**: The task data referenced in the `data` parameter

#### `addRegion(value, extraData = {})`

Creates a new region with your custom value.

**Parameters:**
- `value`: JSON-serializable payload (required)
- `extraData`: Optional object with:
  - `displayText`: Human-readable text displayed in the region label

**Returns:** The created region object

**Example:**
```javascript
const region = addRegion(
  { index: 1, labels: { category: "Food" } },
  { displayText: "Row 1: Food" }
);
```

#### `regions` 

Array of all regions for this tag. Each region has:

- **`region.value`**: Your JSON-serializable payload
- **`region.id`**: Unique region identifier
- **`region.update(value)`**: Replace the region's value
- **`region.delete()`**: Remove the region

**Example:**
```javascript
// Read all regions
regions.forEach(region => {
  console.log(region.value);
});

// Update a region
region.update({ ...region.value, status: 'updated' });

// Delete a region
region.delete();
```

## Output format for regions

Regions created with `ReactCode` follow Label Studio's standard format:

```json
{
  "id": "7ZP46bpbNX",
  "from_name": "custom",
  "to_name": "custom",
  "type": "reactcode",
  "origin": "manual",
  "value": {
    "reactcode": {
      "index": 1,
      "labels": {
        "category": "Food"
      }
    }
  }
}
```

The `value.reactcode` property contains whatever data you passed to `addRegion()`.

## Using the `outputs` parameter 

You can optionally use the `outputs` parameter to define the expected structure of annotation results. It specifies which fields your interface will produce and what data types they contain.

```xml
<ReactCode name="my_interface" toName="my_interface" outputs="summary, sentiment" />
```

!!! note
    The `outputs` parameter defines the schema for validation and documentation purposes. The actual annotation JSON structure is always the same—your data from `addRegion()` is stored in `value.reactcode`. The `outputs` parameter helps Label Studio understand the expected structure for features like model predictions and data export.

### Supported formats

You can define outputs using three approaches (can be combined):

#### Simple field list

List field names separated by commas, semicolons, pipes, or whitespace. Each field defaults to a `string` type.

!!! note

    All separators (`,`, `;`, `|`) are functionally equivalent and can be used interchangeably. Choose based on preference or readability. Comma (`,`) is the most commonly used separator.

```xml
<!-- Comma-separated (most common) -->
outputs="field1, field2, field3"

<!-- Semicolon-separated -->
outputs="field1; field2; field3"

<!-- Pipe-separated -->
outputs="field1|field2|field3"
```

**Result:** All fields become string properties in the schema.

#### Type aliases

Use shorthand syntax for common data patterns. Format: `fieldname:type(arguments)`

| Type Alias | Syntax | Description |
|------------|--------|-------------|
| `choices` | `field:choices(opt1, opt2, opt3)` | Single selection from options (enum) |
| `multichoices` | `field:multichoices(opt1, opt2, opt3)` | Multiple selections (array of enum) |
| `number` | `field:number(min, max)` | Numeric value with optional range |
| `rating` | `field:rating(max)` | Integer rating from 1 to max (default: 5) |

**Examples:**

```xml
<!-- Single choice dropdown -->
outputs="sentiment:choices(positive, negative, neutral)"

<!-- Multi-select tags -->
outputs="categories:multichoices(urgent, bug, feature, docs)"

<!-- Number with range -->
outputs="confidence:number(0, 100)"

<!-- Rating scale 1-10 -->
outputs="quality:rating(10)"

<!-- Combined -->
outputs="rating:choices(good, bad), tags:multichoices(urgent, review), score:number(0, 100)"
```

#### Raw JSON schema (advanced)

For full control, provide a raw JSON Schema. The parser detects JSON when the string starts with `{`.

```xml
<!-- Properties only (auto-wrapped in object schema) -->
outputs='{"name": {"type": "string"}, "age": {"type": "integer", "minimum": 0}}'

<!-- Complete schema with nested objects -->
outputs='{
  "type": "object",
  "properties": {
    "metadata": {
      "type": "object", 
      "properties": {
        "author": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"}
      }
    },
    "tags": {
      "type": "array",
      "items": {"type": "string"}
    }
  },
  "required": ["metadata"]
}'
```
### Empty outputs

If `outputs` is empty or not specified, the schema defaults to an empty object:

```json
{"type": "object", "properties": {}}
```

### Examples of outputs usage

#### Document review interface

```xml
<ReactCode 
  name="review" 
  toName="document" 
  outputs="decision:choices(approve, reject, revise), notes, priority:rating(5)"
/>
```

Produces schema:
```json
{
  "type": "object",
  "properties": {
    "decision": {"type": "string", "enum": ["approve", "reject", "revise"]},
    "notes": {"type": "string"},
    "priority": {"type": "integer", "minimum": 1, "maximum": 5}
  }
}
```

#### Content tagging

```xml
<ReactCode
  name="tagger" 
  toName="text" 
  outputs="topics:multichoices(sports, politics, tech, entertainment), confidence:number(0, 1)"
/>
```

#### Complex JSON schema

```xml
<ReactCode 
  name="entity_extractor" 
  toName="text" 
  outputs='{
    "entities": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": {"type": "string"},
          "label": {"type": "string"},
          "start": {"type": "integer"},
          "end": {"type": "integer"}
        },
        "required": ["text", "label"]
      }
    }
  }'
/>
```

### Resulting output examples

The `outputs` parameter defines the expected schema, and the annotation JSON structure always follows the same format. Here are examples showing how different `outputs` values affect the annotation JSON:

#### Example 1: Simple field list

<br />

{% details <b>Click to expand</b> %}

**Configuration:**
```xml
<ReactCode name="classifier" toName="classifier" outputs="summary, sentiment" />
```

**Code that creates annotation:**
```javascript
addRegion({
  summary: "This is a positive review",
  sentiment: "positive"
}, { displayText: "Positive" });
```

**Resulting annotation JSON:**
```json
{
  "id": "123",
  "from_name": "classifier",
  "to_name": "classifier",
  "type": "reactcode",
  "origin": "manual",
  "value": {
    "reactcode": {
      "summary": "This is a positive review",
      "sentiment": "positive"
    }
  }
}
```
{% enddetails %}

#### Example 2: Type aliases

<br />

{% details <b>Click to expand</b> %}

**Configuration:**
```xml
<ReactCode 
  name="review" 
  toName="review" 
  outputs="decision:choices(approve, reject, revise), notes, priority:rating(5)"
/>
```

**Code that creates annotation:**
```javascript
addRegion({
  decision: "approve",
  notes: "Looks good, minor formatting issues",
  priority: 4
}, { displayText: "Approve - Priority 4" });
```

**Resulting annotation JSON:**
```json
{
  "id": "def456",
  "from_name": "review",
  "to_name": "review",
  "type": "reactcode",
  "origin": "manual",
  "value": {
    "reactcode": {
      "decision": "approve",
      "notes": "Looks good, minor formatting issues",
      "priority": 4
    }
  }
}
```

{% enddetails %}

#### Example 3: JSON schema with nested objects

<br />

{% details <b>Click to expand</b> %}

**Configuration:**
```xml
<ReactCode 
  name="entity_extractor" 
  toName="entity_extractor" 
  outputs='{
    "entities": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": {"type": "string"},
          "label": {"type": "string"},
          "start": {"type": "integer"},
          "end": {"type": "integer"}
        }
      }
    }
  }'
/>
```

**Code that creates annotation:**
```javascript
addRegion({
  entities: [
    { text: "John Doe", label: "PERSON", start: 0, end: 8 },
    { text: "New York", label: "LOCATION", start: 15, end: 23 }
  ]
}, { displayText: "2 entities found" });
```

**Resulting annotation JSON:**
```json
{
  "id": "ghi789",
  "from_name": "entity_extractor",
  "to_name": "entity_extractor",
  "type": "reactcode",
  "origin": "manual",
  "value": {
    "reactcode": {
      "entities": [
        {
          "text": "John Doe",
          "label": "PERSON",
          "start": 0,
          "end": 8
        },
        {
          "text": "New York",
          "label": "LOCATION",
          "start": 15,
          "end": 23
        }
      ]
    }
  }
}
```
{% enddetails %}

### Best Practices

1. **Keep it simple** — Use field lists or type aliases for straightforward cases
2. **Use JSON Schema** — When you need validation rules, nested objects, or arrays
3. **Name fields clearly** — Field names become keys in your annotation results
4. **Match your UI** — Ensure the outputs definition matches what your custom React component actually produces

## ReactCode examples

### Basic example

```xml
<View>
  <ReactCode name="custom" toName="custom" data="$myData">
    <![CDATA[
    function MyComponent({ React, addRegion, regions, data }) {
      const { useState } = React;
      
      const handleClick = () => {
        addRegion({ action: 'clicked', timestamp: Date.now() });
      };
      
      return React.createElement('div', { className: 'p-4' },
        React.createElement('h1', null, 'My Custom Interface'),
        React.createElement('button', { onClick: handleClick }, 'Add Annotation')
      );
    }
    ]]>
  </ReactCode>
</View>
```

### Simple button counter

A basic interface that counts button clicks and saves them as annotations:

```xml
<View>
  <ReactCode name="counter" toName="counter" data="$task">
    <![CDATA[
    function CounterInterface({ React, addRegion, regions, data }) {
      const { useState } = React;
      const [count, setCount] = useState(0);
      
      const handleIncrement = () => {
        const newCount = count + 1;
        setCount(newCount);
        addRegion(
          { count: newCount, timestamp: Date.now() },
          { displayText: `Count: ${newCount}` }
        );
      };
      
      return React.createElement('div', { className: 'p-6 max-w-md mx-auto' },
        React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Click Counter'),
        React.createElement('p', { className: 'mb-4' }, `Current count: ${count}`),
        React.createElement('p', { className: 'mb-4 text-sm text-gray-600' }, 
          `Saved annotations: ${regions.length}`
        ),
        React.createElement('button', {
          onClick: handleIncrement,
          className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
        }, 'Increment and Save')
      );
    }
    ]]>
  </ReactCode>
</View>

<!-- Example task data:
{
  "data": {
    "task": {
      "id": 1,
      "description": "Count clicks"
    }
  }
}
-->
```

### Text classification

A simple interface for classifying text with predefined categories:

```xml
<View>
  <ReactCode name="classifier" toName="classifier" data="$text" outputs='{"category": {"type": "string"}}'>
    <![CDATA[
    function TextClassifier({ React, addRegion, regions, data }) {
      const { useState, useEffect } = React;
      const categories = ['Positive', 'Negative', 'Neutral'];
      const [selectedCategory, setSelectedCategory] = useState(null);
      
      // Load existing annotation if available
      useEffect(() => {
        if (regions.length > 0) {
          setSelectedCategory(regions[0].value.category);
        }
      }, [regions]);
      
      const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        if (regions.length > 0) {
          // Update existing region
          regions[0].update({ category });
        } else {
          // Create new region
          addRegion({ category }, { displayText: category });
        }
      };
      
      return React.createElement('div', { className: 'p-6 max-w-2xl mx-auto' },
        React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Text Classification'),
        React.createElement('div', { className: 'mb-4 p-4 bg-gray-100 rounded' },
          React.createElement('p', { className: 'font-semibold mb-2' }, 'Text to classify:'),
          React.createElement('p', null, data || 'No text provided')
        ),
        React.createElement('div', { className: 'mb-4' },
          React.createElement('p', { className: 'font-semibold mb-2' }, 'Select category:'),
          React.createElement('div', { className: 'flex gap-2' },
            categories.map(category =>
              React.createElement('button', {
                key: category,
                onClick: () => handleCategorySelect(category),
                className: `px-4 py-2 rounded ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`
              }, category)
            )
          )
        ),
        selectedCategory && React.createElement('p', { className: 'text-green-600 font-semibold' },
          `Selected: ${selectedCategory}`
        )
      );
    }
    ]]>
  </ReactCode>
</View>

<!-- Example task data:
{
  "data": {
    "text": "This product is amazing! I love it."
  }
}
-->
```

### Image annotation with metadata

An interface that displays an image and allows adding metadata annotations:

```xml
<View>
  <ReactCode name="imageAnnotator" toName="imageAnnotator" data="$image">
    <![CDATA[
    function ImageAnnotator({ React, addRegion, regions, data }) {
      const { useState } = React;
      const [notes, setNotes] = useState('');
      const [quality, setQuality] = useState('');
      
      const imageUrl = data || data.image || data.image_url;
      
      const handleSave = () => {
        if (!notes && !quality) return;
        
        addRegion(
          {
            notes: notes,
            quality: quality,
            timestamp: Date.now()
          },
          { displayText: `Quality: ${quality || 'N/A'}` }
        );
        
        setNotes('');
        setQuality('');
      };
      
      return React.createElement('div', { className: 'p-6' },
        React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Image Annotation'),
        imageUrl && React.createElement('img', {
          src: imageUrl,
          alt: 'Annotate this image',
          className: 'max-w-full h-auto mb-4 rounded border'
        }),
        React.createElement('div', { className: 'mb-4' },
          React.createElement('label', { className: 'block mb-2 font-semibold' }, 'Quality:'),
          React.createElement('select', {
            value: quality,
            onChange: (e) => setQuality(e.target.value),
            className: 'w-full p-2 border rounded'
          },
            React.createElement('option', { value: '' }, 'Select quality...'),
            React.createElement('option', { value: 'high' }, 'High'),
            React.createElement('option', { value: 'medium' }, 'Medium'),
            React.createElement('option', { value: 'low' }, 'Low')
          )
        ),
        React.createElement('div', { className: 'mb-4' },
          React.createElement('label', { className: 'block mb-2 font-semibold' }, 'Notes:'),
          React.createElement('textarea', {
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            className: 'w-full p-2 border rounded',
            rows: 3,
            placeholder: 'Add your notes here...'
          })
        ),
        React.createElement('button', {
          onClick: handleSave,
          className: 'px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'
        }, 'Save Annotation'),
        regions.length > 0 && React.createElement('div', { className: 'mt-4 p-4 bg-gray-100 rounded' },
          React.createElement('p', { className: 'font-semibold mb-2' }, `Saved annotations (${regions.length}):`),
          regions.map((region, idx) =>
            React.createElement('div', { key: region.id || idx, className: 'mb-2 text-sm' },
              React.createElement('span', null, `#${idx + 1}: `),
              React.createElement('span', null, JSON.stringify(region.value))
            )
          )
        )
      );
    }
    ]]>
  </ReactCode>
</View>

<!-- Example task data:
{
  "data": {
    "image": "https://example.com/image.jpg"
  }
}
-->
```

## Troubleshooting

**Code not rendering**

- Check browser console for errors
- Ensure your function returns a valid React element
- Verify CDATA wrapper is used if code contains special characters
- Check that `data` parameter correctly references your task data

**Regions not appearing**

- Verify you're calling `addRegion()` correctly
- Check that you're rendering the `regions` array in your component
- Ensure `name` and `toName` match for self-referencing tags

**Data not loading**

- Verify the `data` parameter matches your task data structure
- Check that task data exists and is properly formatted
- Use `console.log(data)` to inspect what's being passed

**Styling issues**

- Use Tailwind classes (pre-loaded) or inline styles
- For external CSS, ensure it's loaded via CDN in your component
- Check that styles aren't being overridden by Label Studio's CSS



## Related templates

- [Spreadsheet Editor](/templates/react_spreadsheet)
- [Multi-channel audio transcription](/templates/react_audio)
- [Agentic tracing for claims](/templates/react_claims)