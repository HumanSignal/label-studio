import { Choices, LabelStudio, ToolBar } from "@humansignal/frontend-test/helpers/LSF";
import { FF_CUSTOM_SCRIPT, FF_DEV_3873, FF_REVIEWER_FLOW } from "../../../../src/utils/feature-flags";

enum RESPONSE_TYPE {
  DRAFT = "draft",
  SUBMIT = "submit",
}
const RESPONSE_DELAY = 100;
const WAITING_FOR_EVENTS_DELAY = 200;

describe("Annotation submitting process", () => {
  it("should not create a duplicate annotation if the annotation and draft are saved concurrently", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_DEV_3873]: true,
      [FF_REVIEWER_FLOW]: true,
      [FF_CUSTOM_SCRIPT]: true,
    });
    // here will be stored an order of completed saving action
    // it consists of strings: "draft" and "submit"
    const callApi = cy.spy().as("callApi");

    LabelStudio.params()
      .data({
        text: "Some words",
      })
      .config(`<View>
  <Text name="text" value="$text" />
  <Choices toName="text" name="choice">
    <Choice value="ClickMe"/>
  </Choices>
</View>`)
      // To have "new" annotation we need to use userGenerate
      .withAnnotation({ userGenerate: true, result: [] })
      .withEventListener("submitAnnotation", () => {
        callApi(RESPONSE_TYPE.SUBMIT);
      })
      .withEventListener("submitDraft", () => {
        return new Promise<void>((resolve) => {
          // initialize saving annotation exactly when request of saving draft should be sent to the server
          ToolBar.submitBtn.click();

          // this emulates server response delay
          setTimeout(() => {
            callApi(RESPONSE_TYPE.DRAFT);
            resolve();
          }, RESPONSE_DELAY);
        });
      })
      .init();

    // just to have something to save
    Choices.findChoice("ClickMe").click();

    // Preventing waiting for autosave. It will save time.
    cy.window().then(async (win) => {
      win.Htx.annotationStore.selected.saveDraftImmediately();
    });

    // Wait for all submit events to be invoked, to have `callOrder` ready to check
    cy.wait(WAITING_FOR_EVENTS_DELAY);

    // Check order
    cy.window().then((win) => {
      expect(callApi).to.be.calledTwice;
      expect(callApi.firstCall).to.be.calledWith(RESPONSE_TYPE.DRAFT);
      expect(callApi.secondCall).to.be.calledWith(RESPONSE_TYPE.SUBMIT);
    });
  });
});
