import { Choices, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { repeaterConfig, repeaterPagedConfig, repeaterPagedData } from "../../data/core/repeater_paged";

/**
 * Repeater (type=repeater, no pagination).
 */
describe("Repeater (no pagination)", () => {
  it("renders all repeater items and serializes choices", () => {
    LabelStudio.params().config(repeaterConfig).data(repeaterPagedData).withResult([]).init();

    cy.contains("Page one text").should("be.visible");
    cy.contains("Page two text").should("be.visible");
    cy.contains("Page three text").should("be.visible");

    Choices.findChoice("A").click();
    LabelStudio.serialize().then((serialized) => {
      expect(serialized).to.have.length(1);
      expect(serialized?.[0]?.value?.choices).to.include("A");
    });
  });
});

/**
 * Repeater with mode="pagination" (PagedView).
 * Repeater with mode="pagination" renders PagedView and Pagination (editor BEM prefix: lsf-).
 */
describe("Repeater (PagedView) pagination", () => {
  const paginationRoot = ".lsf-pagination";
  const nextPageBtn = `${paginationRoot} .lsf-pagination__btn_arrow-right:not(.lsf-pagination__btn_arrow-right-double)`;
  const prevPageBtn = `${paginationRoot} .lsf-pagination__btn_arrow-left:not(.lsf-pagination__btn_arrow-left-double)`;

  it("renders pagination and navigates next/previous page", () => {
    LabelStudio.params().config(repeaterPagedConfig).data(repeaterPagedData).withResult([]).init();

    cy.contains("Page one text").should("be.visible");
    cy.get(paginationRoot).should("be.visible");
    cy.get(paginationRoot).invoke("text").should("include", "1 of 3");

    cy.get(nextPageBtn).click();
    cy.get(paginationRoot).invoke("text").should("include", "2 of 3");
    cy.contains("Page two text").should("be.visible");

    cy.get(prevPageBtn).click();
    cy.get(paginationRoot).invoke("text").should("include", "1 of 3");
  });

  it("serializes choices per page", () => {
    LabelStudio.params().config(repeaterPagedConfig).data(repeaterPagedData).withResult([]).init();

    cy.contains("Page one text").should("be.visible");
    cy.get(paginationRoot).should("be.visible");

    Choices.findChoice("A").click();
    LabelStudio.serialize().then((serialized) => {
      expect(serialized).to.have.length(1);
      expect(serialized?.[0]?.value?.choices).to.include("A");
    });

    cy.get(nextPageBtn).click();
    cy.contains("Page two text").should("be.visible");
    Choices.findChoice("B").click();
    LabelStudio.serialize().then((serialized) => {
      expect(serialized).to.have.length(2);
      expect(serialized?.[1]?.value?.choices).to.include("B");
    });
  });

  it("navigates to last page and first page via double-arrow buttons", () => {
    LabelStudio.params().config(repeaterPagedConfig).data(repeaterPagedData).withResult([]).init();

    cy.contains("Page one text").should("be.visible");
    cy.get(paginationRoot).should("be.visible");

    cy.get(`${paginationRoot} .lsf-pagination__btn_arrow-right-double`).click();
    cy.get(paginationRoot).invoke("text").should("include", "3 of 3");
    cy.contains("Page three text").should("be.visible");

    cy.get(`${paginationRoot} .lsf-pagination__btn_arrow-left-double`).click();
    cy.get(paginationRoot).invoke("text").should("include", "1 of 3");
    cy.contains("Page one text").should("be.visible");
  });

  it("restores page size from localStorage (getStoredPageSize)", () => {
    LabelStudio.params()
      .config(repeaterPagedConfig)
      .data(repeaterPagedData)
      .withResult([])
      .withLocalStorageItem("pages:repeater", "2")
      .init();

    cy.contains("Page one text").should("be.visible");
    cy.contains("Page two text").should("be.visible");
    cy.get(paginationRoot).invoke("text").should("include", "1 of 2");
  });

  it("updates URL with view_page param when navigating (updateQueryPage)", () => {
    LabelStudio.params().config(repeaterPagedConfig).data(repeaterPagedData).withResult([]).init();

    cy.contains("Page one text").should("be.visible");
    cy.location("search").should("not.include", "view_page");

    cy.get(nextPageBtn).click();
    cy.location("search").should("include", "view_page=2");
    cy.contains("Page two text").should("be.visible");

    cy.get(prevPageBtn).click();
    cy.location("search").should("not.include", "view_page");
  });

  it("navigates next/previous page via repeater hotkeys (repeater:next-page, repeater:previous-page)", () => {
    LabelStudio.params().config(repeaterPagedConfig).data(repeaterPagedData).withResult([]).init();

    cy.contains("Page one text").should("be.visible");
    cy.get(paginationRoot).invoke("text").should("include", "1 of 3");

    cy.get("body").type("{alt}{rightarrow}");
    cy.get(paginationRoot).invoke("text").should("include", "2 of 3");
    cy.contains("Page two text").should("be.visible");

    cy.get("body").type("{alt}{leftarrow}");
    cy.get(paginationRoot).invoke("text").should("include", "1 of 3");
    cy.contains("Page one text").should("be.visible");
  });
});
