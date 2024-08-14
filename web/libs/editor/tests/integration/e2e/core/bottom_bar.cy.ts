import { BottomBar, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { beforeEach } from "mocha";
import { FF_BULK_ANNOTATION, FF_DEV_3873 } from "../../../../src/utils/feature-flags";

beforeEach(() => {
  LabelStudio.addFeatureFlagsOnPageLoad({
    [FF_DEV_3873]: true,
    [FF_BULK_ANNOTATION]: true,
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
      .withInterface("controls:custom")
      .withParam("controlButtons", [
        {
          title: "Custom button 1",
          look: "primary",
          onClick: () => {
            clickHandler1();
          },
        },
        {
          title: "Custom button 2",
          look: "alt",
          onClick: () => {
            clickHandler2();
          },
        },
      ])
      .init();

    BottomBar.controlButtons.should("have.length", 2);
    BottomBar.controlButtons.eq(0).should("have.text", "Custom button 1");
    BottomBar.controlButtons.eq(1).should("have.text", "Custom button 2");

    BottomBar.controlButtons.eq(0).click();
    BottomBar.controlButtons.eq(1).click();

    cy.window().then((win) => {
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
      .withParam("controlButtons", [
        {
          title: "Custom save",
          onClick: async (e, button) => {
            await promise;
            button.updateProps({ title: "Custom update" });
          },
        },
      ])
      .init();

    BottomBar.controlButtons.should("have.length", 1);
    BottomBar.controlButtons.eq(0).should("have.text", "Custom save");

    BottomBar.controlButtons.eq(0).click();
    cy.wait(100).then(() => {
      resolve();
    });
    BottomBar.controlButtons.eq(0).should("have.text", "Custom update");
  });
});
