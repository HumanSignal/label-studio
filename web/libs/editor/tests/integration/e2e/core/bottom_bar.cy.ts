import { Choices, ToolBar, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import type { CustomButtonType } from "../../../../src/stores/CustomButton";
import { FF_BULK_ANNOTATION, FF_DEV_3873 } from "../../../../src/utils/feature-flags";
import { choicesConfig, simpleData } from "../../data/control_tags/choice";

beforeEach(() => {
  LabelStudio.addFeatureFlagsOnPageLoad({
    [FF_BULK_ANNOTATION]: true,
    [FF_DEV_3873]: true,
  });
});

describe("Bottom bar", () => {
  it("should display custom buttons", () => {
    const clickHandler1 = cy.spy().as("clickHandler1");
    const clickHandler2 = cy.spy().as("clickHandler2");

    LabelStudio.params()
      .config("<View></View>")
      .data({})
      .withResult([])
      .withParam("customButtons", [
        {
          name: "custom_btn_1",
          title: "Custom button 1",
          look: "filled",
        },
        {
          name: "custom_btn_2",
          title: "Custom button 2",
          look: "string",
        },
      ])
      .withEventListener("customButton", (_store, buttonName: string) => {
        switch (buttonName) {
          case "custom_btn_1": {
            clickHandler1();
            break;
          }
          case "custom_btn_2": {
            clickHandler2();
            break;
          }
        }
      })
      .init();

    ToolBar.controlButtons.should("have.length", 2);
    ToolBar.controlButtons.eq(0).should("have.text", "Custom button 1");
    ToolBar.controlButtons.eq(1).should("have.text", "Custom button 2");

    ToolBar.controlButtons.eq(0).click();
    ToolBar.controlButtons.eq(1).click();

    cy.window().then((_win) => {
      expect(clickHandler1).to.be.called;
      expect(clickHandler2).to.be.called;
    });
  });

  it("should allow modifying custom buttons", () => {
    let resolve: Function;
    const promise = new Promise<undefined>((r) => {
      resolve = r as Function;
    });
    LabelStudio.params()
      .config("<View></View>")
      .data({})
      .withResult([])
      .withInterface("controls:custom")
      .withParam("customButtons", [
        {
          name: "custom_save_btn",
          title: "Custom save",
        },
      ])
      .withEventListener(
        "customButton",
        async (_store, buttonName: string, { button }: { button: CustomButtonType }) => {
          switch (buttonName) {
            case "custom_save_btn": {
              await promise;
              button.updateState({ name: "custom_update_btn", title: "Custom update" });
            }
          }
        },
      )
      .init();

    ToolBar.controlButtons.should("have.length", 1);
    ToolBar.controlButtons.eq(0).should("have.text", "Custom save");

    ToolBar.controlButtons.eq(0).click();
    // Resolve after click is processed so the listener can complete (deterministic: next microtask)
    cy.then(() => {
      queueMicrotask(() => (resolve as () => void)());
    });
    ToolBar.controlButtons.eq(0).should("have.text", "Custom update");
  });

  describe("Edit history", () => {
    it("shows undo/redo/reset and undoes then redoes a choice", () => {
      LabelStudio.params().config(choicesConfig).data(simpleData).withResult([]).withInterface("edit-history").init();

      LabelStudio.waitForObjectsReady();
      cy.get('[data-testid="bottombar-undo-button"]').should("be.visible").and("be.disabled");
      cy.get('[data-testid="bottombar-redo-button"]').should("be.visible").and("be.disabled");
      cy.get('[data-testid="bottombar-reset-button"]').should("be.visible").and("be.disabled");

      Choices.findChoice("Choice 2").click();
      cy.get('[data-testid="bottombar-undo-button"]').should("not.be.disabled");
      cy.get('[data-testid="bottombar-reset-button"]').should("not.be.disabled");

      cy.get('[data-testid="bottombar-undo-button"]').click();
      LabelStudio.serialize().then((serialized) => {
        const choices = serialized?.[0]?.value?.choices ?? [];
        expect(choices).to.deep.equal([]);
      });

      cy.get('[data-testid="bottombar-redo-button"]').should("not.be.disabled").click();
      LabelStudio.serialize().then((serialized) => {
        expect(serialized?.[0]?.value?.choices).to.include("Choice 2");
      });
    });

    it("reset reverts all changes", () => {
      LabelStudio.params().config(choicesConfig).data(simpleData).withResult([]).withInterface("edit-history").init();

      LabelStudio.waitForObjectsReady();
      Choices.findChoice("Choice 1").click();
      cy.get('[data-testid="bottombar-reset-button"]').click();
      LabelStudio.serialize().then((serialized) => {
        const choices = serialized?.[0]?.value?.choices ?? [];
        expect(choices).to.deep.equal([]);
      });
    });

    it("redo is disabled after a new action following undo", () => {
      LabelStudio.params().config(choicesConfig).data(simpleData).withResult([]).withInterface("edit-history").init();

      LabelStudio.waitForObjectsReady();
      Choices.findChoice("Choice 2").click();
      cy.get('[data-testid="bottombar-undo-button"]').click();
      cy.get('[data-testid="bottombar-redo-button"]').should("not.be.disabled");
      Choices.findChoice("Choice 1").click();
      cy.get('[data-testid="bottombar-redo-button"]').should("be.disabled");
      LabelStudio.serialize().then((serialized) => {
        expect(serialized?.[0]?.value?.choices).to.include("Choice 1");
      });
    });
  });
});
