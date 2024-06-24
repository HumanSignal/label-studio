import { Choices, LabelStudio, ToolBar } from "@humansignal/frontend-test/helpers/LSF";
import { FF_DEV_3873, FF_REVIEWER_FLOW } from "../../../../src/utils/feature-flags";

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
    });
    // here will be stored an order of completed saving action
    // it consists of strings: "draft" and "submit"
    const callLogs: RESPONSE_TYPE[] = [];

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
      .withEventListener("submitDraft", () => {
        return new Promise((resolve) => {
          // initialize saving annotation exactly when request of saving draft should be sent to the server
          ToolBar.submitBtn.click();

          // this emulates server response delay
          setTimeout(() => {
            callLogs.push(RESPONSE_TYPE.DRAFT);
            resolve(void 0);
          }, RESPONSE_DELAY);
        });
      })
      .withEventListener("submitAnnotation", () => {
        callLogs.push(RESPONSE_TYPE.SUBMIT);
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
    cy.window().then(async (win) => {
      expect(callLogs).to.deep.equal([RESPONSE_TYPE.DRAFT, RESPONSE_TYPE.SUBMIT]);
    });
  });
});
