import { ToolBar, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { beforeEach } from "mocha";
import { FF_BULK_ANNOTATION, FF_DEV_3873 } from "../../../../src/utils/feature-flags";

beforeEach(() => {
  LabelStudio.addFeatureFlagsOnPageLoad({
    [FF_BULK_ANNOTATION]: true,
  });
});

for (const isFFDev3873 of [true, false]) {
  const ffModePostfix = isFFDev3873 ? "(new ui)" : "(old ui)";
  describe(`Bottom bar ${ffModePostfix}`, () => {
    beforeEach(() => {
      LabelStudio.addFeatureFlagsOnPageLoad({
        [FF_DEV_3873]: isFFDev3873,
      });
    });

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

      ToolBar.controlButtons.should("have.length", 2);
      ToolBar.controlButtons.eq(0).should("have.text", "Custom button 1");
      ToolBar.controlButtons.eq(1).should("have.text", "Custom button 2");

      ToolBar.controlButtons.eq(0).click();
      ToolBar.controlButtons.eq(1).click();

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

      ToolBar.controlButtons.should("have.length", 1);
      ToolBar.controlButtons.eq(0).should("have.text", "Custom save");

      ToolBar.controlButtons.eq(0).click();
      cy.wait(100).then(() => {
        resolve();
      });
      ToolBar.controlButtons.eq(0).should("have.text", "Custom update");
    });
  });
}
