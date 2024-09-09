class ParagraphsHelper {
  private get _baseRootSelector() {
    return ".lsf-paragraphs";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }
}

const Paragraphs = new ParagraphsHelper("&:eq(0)");
const useParagraphs = (rootSelector: string) => {
  return new ParagraphsHelper(rootSelector);
};

export { Paragraphs, useParagraphs };
