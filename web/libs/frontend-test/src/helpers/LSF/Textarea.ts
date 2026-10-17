class TextareaHelper {
  private get _baseRootSelector() {
    return ".lsf-text-area";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }

  get input() {
    return this.root.find('[aria-label="TextArea Input"]');
  }

  get rows() {
    return this.root.find(".lsf-row");
  }

  row(idx: number) {
    return this.rows.eq(idx - 1);
  }

  type(text: string) {
    return this.input.type(text);
  }

  clickRowEdit(idx: number) {
    this.row(idx).find('[aria-label="Edit Region"]').click();
  }

  rowInput(idx: number) {
    return this.row(idx).find(".ant-input, input, textarea");
  }

  rowType(idx: number, text: string) {
    return this.rowInput(idx).type(text);
  }

  hasValue(text: string) {
    this.rows.contains(text);
  }

  hasNoValue(text: string) {
    this.rows.contains(text).should("not.exist");
  }

  // =========================================================================
  // Markdown Editor Helpers (used when markdown=true)
  // Uses partial class matching [class*='...'] for CSS Modules compatibility
  // =========================================================================

  /**
   * Get the CodeMirror editor element
   */
  get editor() {
    return this.root.find(".CodeMirror");
  }

  /**
   * Get the view toggle button (Edit/Split)
   */
  get viewToggleBtn() {
    return this.root.find("button");
  }

  /**
   * Get the stats panel (character/word counts)
   * Uses partial match for CSS Modules hashed class names
   */
  get stats() {
    return this.root.find("[class*='markdownEditor__stats']");
  }

  /**
   * Get the markdown preview area
   * Uses partial match for CSS Modules hashed class names
   */
  get preview() {
    return this.root.find("[class*='markdownEditor__preview']");
  }

  /**
   * Get the editor container
   * Uses partial match for CSS Modules hashed class names
   */
  get editorContainer() {
    return this.root.find("[class*='markdownEditor__editor']");
  }

  /**
   * Get the content area (changes based on view mode)
   * Uses partial match for CSS Modules hashed class names
   */
  get content() {
    return this.root.find("[class*='markdownEditor__content']");
  }

  /**
   * Type markdown content in the CodeMirror editor
   */
  typeMarkdown(text: string) {
    return this.editor.type(text);
  }

  /**
   * Switch to split view mode
   */
  switchToSplitView() {
    return this.viewToggleBtn.contains("Split").click();
  }

  /**
   * Switch back to edit only mode
   */
  switchToEditView() {
    return this.viewToggleBtn.contains("Edit").click();
  }
}

const Textarea = new TextareaHelper("&:eq(0)");
const useTextarea = (rootSelector: string) => {
  return new TextareaHelper(rootSelector);
};

export { Textarea, useTextarea };
