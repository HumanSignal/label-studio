import { LabelStudio, Sidebar, Textarea } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleData,
  textareaConfigPerRegion,
  textareaConfigSimple,
  textareaConfigWithValue,
  textareaConfigWithValueAndRows,
  textareaResultsPerRegion,
} from "../../data/control_tags/textarea";
import { FF_LEAD_TIME } from "../../../../src/utils/feature-flags";

describe("Control Tags - TextArea - Lead Time", () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LEAD_TIME]: true,
    });
  });

  it("should calculate lead_time for global TextArea", () => {
    LabelStudio.params().config(textareaConfigSimple).data(simpleData).withResult([]).init();

    Textarea.type("This is a test{enter}");
    Textarea.hasValue("This is a test");

    LabelStudio.serialize().then((result) => {
      const lead_time = result[0].meta.lead_time;

      expect(result.length).to.be.eq(1);
      expect(lead_time).to.be.gt(0);

      Textarea.type("Another test{enter}");

      LabelStudio.serialize().then((result2) => {
        expect(result2[0].meta.lead_time).to.be.gt(lead_time);
      });
    });
  });

  it("should calculate lead_time for per-region TextArea", () => {
    LabelStudio.params().config(textareaConfigPerRegion).data(simpleData).withResult(textareaResultsPerRegion).init();

    Sidebar.findRegionByIndex(0).click();

    Textarea.type("This is a test{enter}");
    Textarea.hasValue("This is a test");

    LabelStudio.serialize().then((result) => {
      // first result for region itself, second for textarea
      const lead_time = result[1].meta.lead_time;

      expect(result.length).to.be.eq(2);
      expect(lead_time).to.be.gt(0);

      Textarea.type("Another test{enter}");

      LabelStudio.serialize().then((result2) => {
        expect(result2[1].meta.lead_time).to.be.gt(lead_time);
      });
    });
  });
});

describe("Control Tags - TextArea - Pre-filled Value", () => {
  it("should display pre-filled value in the input field", () => {
    LabelStudio.params().config(textareaConfigWithValue).data(simpleData).withResult([]).init();

    // The input field should have the pre-filled value
    Textarea.input.should("have.value", "Pre-filled text");
  });

  it("should clear input after submitting pre-filled value", () => {
    LabelStudio.params().config(textareaConfigWithValue).data(simpleData).withResult([]).init();

    // Verify pre-filled value is present
    Textarea.input.should("have.value", "Pre-filled text");

    // Submit the value by pressing Enter
    Textarea.type("{enter}");

    // Input should be empty after submission
    Textarea.input.should("have.value", "");

    // The submitted text should appear as a region
    Textarea.hasValue("Pre-filled text");

    // Verify the result contains the submitted text
    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(1);
      expect(result[0].value.text).to.deep.eq(["Pre-filled text"]);
    });
  });

  it("should show pre-filled value even when there are existing text regions", () => {
    const existingResult = [
      {
        id: "result1",
        type: "textarea",
        from_name: "desc",
        to_name: "text",
        value: {
          text: ["Previously added text"],
        },
      },
    ];

    LabelStudio.params().config(textareaConfigWithValue).data(simpleData).withResult(existingResult).init();

    // Should display the existing text region
    Textarea.hasValue("Previously added text");

    // Input field should still have the pre-filled value
    Textarea.input.should("have.value", "Pre-filled text");
  });

  it("should work with multi-row textarea", () => {
    LabelStudio.params().config(textareaConfigWithValueAndRows).data(simpleData).withResult([]).init();

    // The textarea should have the pre-filled value
    Textarea.input.should("have.value", "Pre-filled text");

    // Submit by clicking the Add button (shows when rows > 1)
    Textarea.input.type("{enter}");

    // Input should be empty after submission
    Textarea.input.should("have.value", "");

    // The submitted text should appear as a region
    Textarea.hasValue("Pre-filled text");
  });

  it("should allow adding new text after submitting pre-filled value", () => {
    LabelStudio.params().config(textareaConfigWithValue).data(simpleData).withResult([]).init();

    // Submit pre-filled value
    Textarea.type("{enter}");

    // Add new text
    Textarea.type("New text added{enter}");

    // Both texts should be present
    Textarea.hasValue("Pre-filled text");
    Textarea.hasValue("New text added");

    // Verify the results
    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(1);
      expect(result[0].value.text).to.deep.eq(["Pre-filled text", "New text added"]);
    });
  });
});
