---
title: Markdown
type: tags
order: 504
meta_title: Markdown Tag for Rendering Markdown Text
meta_description: Customize Label Studio with the Markdown tag to display formatted markdown text content for machine learning and data science projects.
---

The `Markdown` tag is used to display markdown-formatted text content on the labeling interface. Use this tag to provide rich text instructions, descriptions, or content with formatting support including headers, bold text, lists, links, and more.

Also that's the simplest way to display auxiliary text content on the labeling interface.

Use with the following data types: Text content in Markdown format.

{% insertmd includes/tags/view.md %}

### Example

Display static markdown instructions on the labeling interface:

```html
<View>
  <Markdown>
## Instructions

Please **carefully** read the following text and mark all entities.

- Look for **person names**
- Look for **organization names**  
- Look for **locations**

> Remember to be thorough in your analysis.
  </Markdown>
  <Text name="text" value="$text" />
</View>
```

Indents are important in markdown, so it's advised to keep markdown content unindented.

### Example

Display markdown content from task data:

```html
<View>
  <Markdown value="$markdown_description" />
  <Text name="text" value="$text" />
</View>
```

**Example task data:**

```json
{
  "markdown_description": "## Analysis Task\n\nPlease analyze the following text for sentiment:\n\n- **Positive** - Shows satisfaction or approval\n- **Negative** - Shows dissatisfaction or criticism\n- **Neutral** - Shows no particular sentiment",
  "text": "The product was amazing and I loved it!"
}
```

### Example

Display styled markdown content:

```html
<View>
  <Markdown 
    value="$content"
    style="background: #f5f5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff;" />
</View>
```

### Supported Markdown Features

The Markdown tag supports standard Markdown syntax including:

- **Headers** - `# ## ### ####` etc.
- **Bold and italic** - `**bold**` and `*italic*`
- **Lists** - Ordered (`1. item`) and unordered (`- item`)
- **Links** - `[link text](URL)`
- **Code** - Inline `` `code` `` and code blocks with ``` 
- **Blockquotes** - `> quoted text`
- **Line breaks** - Double line breaks create new paragraphs
