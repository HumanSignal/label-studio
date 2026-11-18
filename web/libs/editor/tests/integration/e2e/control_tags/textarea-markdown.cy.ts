/**
 * TextArea Markdown Editor Integration Tests
 *
 * Tests for the Markdown editing feature in TextArea component.
 * These tests verify the markdown attribute functionality when enabled.
 *
 * Related Issue: feat/textarea-with-markdown
 */

import { LabelStudio, Textarea, ToolBar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleData,
  textareaConfigWithMarkdown,
  textareaConfigWithMarkdownAndValue,
  markdownResultExisting,
} from "../../data/control_tags/textarea";

describe("Control Tags - TextArea - Markdown Editor", () => {
  describe("TC-MD-001: Basic Rendering", () => {
    it("should render MarkdownEditor when markdown=true", () => {
      LabelStudio.params().config(textareaConfigWithMarkdown).data(simpleData).withResult([]).init();

      // CodeMirror editor should exist (Markdown editor uses CodeMirror)
      Textarea.editor.should("exist");

      // Standard textarea should not exist
      Textarea.input.should("not.exist");
    });

    it("should render MarkdownEditor with pre-filled value", () => {
      LabelStudio.params().config(textareaConfigWithMarkdownAndValue).data(simpleData).withResult([]).init();

      // The editor should contain the pre-filled markdown value
      Textarea.editor.should("contain", "Bold");
      Textarea.editor.should("contain", "italic");
    });
  });

  describe("TC-MD-002: Edit and Submit", () => {
    it("should allow typing markdown content and submit on Shift+Enter", () => {
      LabelStudio.params().config(textareaConfigWithMarkdown).data(simpleData).withResult([]).init();

      // Type markdown content and submit with Shift+Enter
      Textarea.typeMarkdown("**Bold text**{shift+enter}");

      // Content should be submitted as a region (use cy.contains for markdown mode)
      cy.contains("Bold text").should("exist");

      // Verify serialization preserves markdown syntax
      LabelStudio.serialize().then((result) => {
        expect(result.length).to.be.eq(1);
        expect(result[0].value.text).to.deep.eq(["**Bold text**"]);
      });
    });

    it("should handle various markdown syntax", () => {
      LabelStudio.params().config(textareaConfigWithMarkdown).data(simpleData).withResult([]).init();

      // Type various markdown syntax
      Textarea.typeMarkdown("# Heading{shift+enter}");

      cy.contains("Heading").should("exist");

      LabelStudio.serialize().then((result) => {
        expect(result.length).to.be.eq(1);
        expect(result[0].value.text).to.deep.eq(["# Heading"]);
      });
    });

    it("should add new text after submitting pre-filled value", () => {
      LabelStudio.params().config(textareaConfigWithMarkdownAndValue).data(simpleData).withResult([]).init();

      // Submit pre-filled value with Shift+Enter
      Textarea.typeMarkdown("{shift+enter}");

      // Verify pre-filled value was submitted (using serialized result)
      LabelStudio.serialize().then((result) => {
        expect(result.length).to.be.eq(1);
        expect(result[0].value.text).to.include("**Bold** and *italic* text");
      });
    });
  });

  describe("TC-MD-003: Split View Mode", () => {
    beforeEach(() => {
      LabelStudio.params().config(textareaConfigWithMarkdown).data(simpleData).withResult([]).init();
    });

    it("should toggle between Edit and Split modes", () => {
      // Default should be Edit mode
      Textarea.editorContainer.should("exist");
      Textarea.preview.should("not.exist");

      // Click Split button
      Textarea.switchToSplitView();

      // Now should be Split mode - check for split class using partial match
      Textarea.content.should("have.attr", "class").and("include", "split");

      // Button should now say "Edit"
      Textarea.viewToggleBtn.should("contain", "Edit");

      // Click Edit button to go back
      Textarea.switchToEditView();

      // Back to Edit mode - preview should not exist
      Textarea.preview.should("not.exist");
    });

    it("should show real-time markdown preview", () => {
      // Switch to Split mode
      Textarea.switchToSplitView();

      // Preview area should show empty state initially
      Textarea.preview.should("contain", "Nothing to preview");

      // Type markdown in editor
      Textarea.typeMarkdown("**Bold** and *italic*");

      // Preview should update with rendered markdown
      Textarea.preview.should("contain", "Bold");
      Textarea.preview.should("contain", "italic");

      // Empty state should be gone
      Textarea.preview.should("not.contain", "Nothing to preview");
    });

    it("should render various markdown elements in preview", () => {
      // Switch to Split mode
      Textarea.switchToSplitView();

      // Type markdown content with various elements
      // Note: markdown requires blank line before lists for proper rendering
      Textarea.typeMarkdown("# Heading{enter}Some text with **bold** and *italic*");

      // Verify preview renders
      Textarea.preview.should("contain", "Heading");
      Textarea.preview.should("contain", "bold");
      Textarea.preview.should("contain", "italic");
    });
  });

  describe("TC-MD-004: Region Display", () => {
    it("should render markdown content in regions", () => {
      LabelStudio.params()
        .config(textareaConfigWithMarkdown)
        .data(simpleData)
        .withResult(markdownResultExisting)
        .init();

      // The markdown content should be rendered (HTML elements present)
      // Check for rendered markdown elements - bold and italic
      cy.get("strong").should("contain", "Pre-filled bold");
      cy.get("em").should("contain", "italic");
    });

    it("should handle multiple markdown entries", () => {
      const multipleResults = [
        {
          id: "result1",
          type: "textarea",
          from_name: "desc",
          to_name: "text",
          value: {
            text: ["**First** entry", "*Second* entry", "**Third** entry"],
          },
        },
      ];

      LabelStudio.params().config(textareaConfigWithMarkdown).data(simpleData).withResult(multipleResults).init();

      // All three entries should be visible
      Textarea.hasValue("First");
      Textarea.hasValue("Second");
      Textarea.hasValue("Third");
    });
  });

  describe("TC-MD-005: Serialization and Auto-submit", () => {
    it("should serialize markdown content with syntax preserved", () => {
      LabelStudio.params().config(textareaConfigWithMarkdown).data(simpleData).withResult([]).init();

      // Type markdown content and submit with Shift+Enter
      Textarea.typeMarkdown("**Bold** *italic* text{shift+enter}");

      LabelStudio.serialize().then((result) => {
        expect(result.length).to.be.eq(1);
        expect(result[0].value.text[0]).to.eq("**Bold** *italic* text");
      });
    });

    it("should auto-submit on annotation submission", () => {
      LabelStudio.params().config(textareaConfigWithMarkdown).data(simpleData).withResult([]).init();

      // Type text but don't press Enter
      Textarea.typeMarkdown("Auto-submit text");

      // Verify text is in editor
      Textarea.editor.should("contain", "Auto-submit text");

      // Submit annotation
      ToolBar.updateBtn.click();

      // Verify text was auto-submitted
      LabelStudio.serialize().then((result) => {
        expect(result.length).to.be.eq(1);
        expect(result[0].value.text).to.deep.eq(["Auto-submit text"]);
      });
    });

    it("should load and serialize existing markdown results", () => {
      LabelStudio.params()
        .config(textareaConfigWithMarkdown)
        .data(simpleData)
        .withResult(markdownResultExisting)
        .init();

      // Existing markdown should be visible
      Textarea.hasValue("Pre-filled bold");
      Textarea.hasValue("italic");

      LabelStudio.serialize().then((result) => {
        expect(result.length).to.be.eq(1);
        expect(result[0].value.text).to.deep.eq(["**Pre-filled bold** and _italic_ content"]);
      });
    });
  });

  describe("TC-MD-006: Character and Word Count", () => {
    it("should display character and word counts", () => {
      LabelStudio.params().config(textareaConfigWithMarkdown).data(simpleData).withResult([]).init();

      // Stats should exist
      Textarea.stats.should("exist");

      // Initial counts: 0 characters, 0 words
      Textarea.stats.should("contain", "0 characters");
      Textarea.stats.should("contain", "0 words");

      // Type content
      Textarea.typeMarkdown("Hello world");

      // Verify counts updated
      Textarea.stats.should("contain", "11 characters");
      Textarea.stats.should("contain", "2 words");
    });

    it("should update counts in real-time", () => {
      LabelStudio.params().config(textareaConfigWithMarkdown).data(simpleData).withResult([]).init();

      // Type a word
      Textarea.typeMarkdown("Test");

      // Should show 4 characters, 1 word
      Textarea.stats.should("contain", "4 characters");
      Textarea.stats.should("contain", "1 word");

      // Add more content
      Textarea.typeMarkdown(" more words");

      // Should update to 15 characters, 3 words
      Textarea.stats.should("contain", "15 characters");
      Textarea.stats.should("contain", "3 words");
    });
  });

  describe("TC-MD-007: Keyboard Shortcuts", () => {
    beforeEach(() => {
      LabelStudio.params()
        .config(textareaConfigWithMarkdown)
        .data(simpleData)
        .withResult([])
        .init();
    });

    it("should support Ctrl+B / Cmd+B for bold formatting", () => {
      // Type some text
      Textarea.typeMarkdown("bold text");

      // Select all text (Ctrl/Cmd+A) and apply bold (Ctrl/Cmd+B)
      Textarea.editor.type("{ctrl}a");
      Textarea.editor.type("{ctrl}b");

      // Should wrap with **
      Textarea.editor.should("contain", "**bold text**");
    });

    it("should support Ctrl+I / Cmd+I for italic formatting", () => {
      // Type some text
      Textarea.typeMarkdown("italic text");

      // Select all and apply italic
      Textarea.editor.type("{ctrl}a");
      Textarea.editor.type("{ctrl}i");

      // Should wrap with *
      Textarea.editor.should("contain", "*italic text*");
    });

    it("should support Ctrl+` for inline code formatting", () => {
      // Type some text
      Textarea.typeMarkdown("code text");

      // Select all and apply inline code
      Textarea.editor.type("{ctrl}a");
      Textarea.editor.type("{ctrl}`");

      // Should wrap with `
      Textarea.editor.should("contain", "`code text`");
    });

    it("should support Ctrl+K / Cmd+K for link insertion", () => {
      // Type some text
      Textarea.typeMarkdown("link text");

      // Select all and insert link
      Textarea.editor.type("{ctrl}a");
      Textarea.editor.type("{ctrl}k");

      // Should create link format
      Textarea.editor.should("contain", "[link text](url)");
    });

    it("should support Ctrl+/ / Cmd+/ for toggle comment", () => {
      // Type some text
      Textarea.typeMarkdown("comment text");

      // Select all and toggle comment
      Textarea.editor.type("{ctrl}a");
      Textarea.editor.type("{ctrl}/");

      // Should wrap with HTML comment
      Textarea.editor.should("contain", "<!-- comment text -->");

      // Toggle again to uncomment
      Textarea.editor.type("{ctrl}a");
      Textarea.editor.type("{ctrl}/");

      // Should unwrap
      Textarea.editor.should("contain", "comment text");
      Textarea.editor.should("not.contain", "<!--");
    });

    it("should insert formatting markers when no text is selected", () => {
      // Place cursor and press Ctrl+B without selection
      Textarea.editor.click();
      Textarea.editor.type("{ctrl}b");

      // Should insert ** markers
      Textarea.editor.should("contain", "**");
    });

    it("should allow combining multiple formatting shortcuts", () => {
      // Type text, make it bold, then continue typing
      Textarea.typeMarkdown("Regular text");
      
      // Add space and bold text
      Textarea.typeMarkdown(" ");
      Textarea.editor.type("{ctrl}b");
      Textarea.typeMarkdown("bold");
      
      // Should have mixed content
      Textarea.editor.should("contain", "Regular text");
      Textarea.editor.should("contain", "**bold**");
    });

    it("should preview formatted text in split mode", () => {
      // Switch to split mode
      Textarea.switchToSplitView();

      // Type and format text
      Textarea.typeMarkdown("Sample text");
      Textarea.editor.type("{ctrl}a");
      Textarea.editor.type("{ctrl}b");

      // Preview should show rendered bold (not the markdown syntax)
      Textarea.preview.should("contain", "Sample text");
      // Preview should render it as bold HTML (depends on Markdown component)
    });
  });
});
