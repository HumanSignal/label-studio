import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import {
  listObjectTableConfig,
  listObjectTableData,
  listPrimitiveTableConfig,
  listPrimitiveTableData,
  objectTableConfig,
  objectTableData,
} from "../../data/table/table";

describe("Table", () => {
  it("sorts key-value object rows by key", () => {
    LabelStudio.params().config(objectTableConfig).data(objectTableData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    cy.get(".ant-table-tbody tr").should("have.length", 4);
    cy.get(".ant-table-tbody tr td:first-child").then(($cells) => {
      const keys = [...$cells].map((cell) => cell.textContent?.trim() ?? "");

      expect(keys).to.deep.equal(["aaTest", "ATest", "bbbTest", "cTest"]);
    });
  });

  it("renders array of objects with derived columns", () => {
    LabelStudio.params().config(listObjectTableConfig).data(listObjectTableData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    cy.contains(".ant-table-thead th", "a").should("be.visible");
    cy.contains(".ant-table-thead th", "b").should("be.visible");
    cy.contains(".ant-table-thead th", "c").should("be.visible");
    cy.contains(".ant-table-thead th", "Name").should("not.exist");
    cy.contains(".ant-table-thead th", "Value").should("not.exist");

    cy.contains(".ant-table-tbody td", "1").should("be.visible");
    cy.contains(".ant-table-tbody td", "2").should("be.visible");
    cy.contains(".ant-table-tbody td", "3").should("be.visible");
    cy.contains(".ant-table-tbody td", "4").should("be.visible");
    cy.contains(".ant-table-tbody td", "5").should("be.visible");
  });

  it("renders array of primitives as key/value table", () => {
    LabelStudio.params().config(listPrimitiveTableConfig).data(listPrimitiveTableData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    cy.contains(".ant-table-thead th", "Name").should("be.visible");
    cy.contains(".ant-table-thead th", "Value").should("be.visible");

    cy.contains(".ant-table-tbody td", "0").should("be.visible");
    cy.contains(".ant-table-tbody td", "alpha").should("be.visible");
    cy.contains(".ant-table-tbody td", "1").should("be.visible");
    cy.contains(".ant-table-tbody td", "123").should("be.visible");
    cy.contains(".ant-table-tbody td", "2").should("be.visible");
    cy.contains(".ant-table-tbody td", '{"nested":true}').should("be.visible");
  });

  it("supports table-linked classification submission", () => {
    LabelStudio.params().config(objectTableConfig).data(objectTableData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    cy.contains("label", "Correct").click();

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].type).to.equal("choices");
      expect(result[0].value.choices).to.deep.equal(["Correct"]);
    });
  });
});
