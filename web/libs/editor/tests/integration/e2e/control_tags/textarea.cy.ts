import { LabelStudio, Sidebar, Textarea, ToolBar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleData,
  textareaConfigPerRegion,
  textareaConfigSimple,
  textareaConfigWithValue,
  textareaConfigWithValueAndRows,
  textareaConfigWithMaxSubmissions,
  textareaConfigWithValueAndMaxSubmissions,
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

    // Submit by using hotkey
    Textarea.input.type("{shift+enter}");

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

// All annotations have id, so the button for submit is Update
describe("Control Tags - TextArea - Auto-submit on Annotation Submit", () => {
  it("should auto-submit pre-filled value when annotation is submitted", () => {
    LabelStudio.params().config(textareaConfigWithValue).data(simpleData).withResult([]).init();

    // Verify pre-filled value is in input
    Textarea.input.should("have.value", "Pre-filled text");

    // Submit annotation without manually adding the text
    ToolBar.updateBtn.click();

    // Verify input is empty after submission
    Textarea.input.should("have.value", "");

    // Wait for submission to complete and serialize
    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(1);
      expect(result[0].value.text).to.deep.eq(["Pre-filled text"]);
    });
  });

  it("should auto-submit manually entered text when annotation is submitted", () => {
    LabelStudio.params().config(textareaConfigSimple).data(simpleData).withResult([]).init();

    // Type text but don't press Enter to add it
    Textarea.type("Manually typed text");

    // Verify the text is in input but not yet added as a region
    Textarea.input.should("have.value", "Manually typed text");

    // Submit annotation
    ToolBar.updateBtn.click();

    // Verify input is empty after submission
    Textarea.input.should("have.value", "");

    // Wait for submission and verify the text was auto-submitted
    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(1);
      expect(result[0].value.text).to.deep.eq(["Manually typed text"]);
    });
  });

  it("should not auto-submit when maxSubmissions is reached and input is hidden", () => {
    LabelStudio.params().config(textareaConfigWithMaxSubmissions).data(simpleData).withResult([]).init();

    // Add first text
    Textarea.type("First text{enter}");
    Textarea.hasValue("First text");

    // Add second text - this should reach maxSubmissions (2)
    Textarea.type("Second text{enter}");
    Textarea.hasValue("Second text");

    // Verify input is no longer visible (maxSubmissions reached)
    Textarea.input.should("not.exist");

    // Submit annotation - should not add any new text
    ToolBar.updateBtn.click();

    // Verify only the two manually added texts are in the result
    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(1);
      expect(result[0].value.text).to.deep.eq(["First text", "Second text"]);
    });
  });

  it("should not auto-submit pre-filled value when maxSubmissions is reached", () => {
    LabelStudio.params().config(textareaConfigWithValueAndMaxSubmissions).data(simpleData).withResult([]).init();

    // Verify pre-filled value is visible initially
    Textarea.input.should("have.value", "Pre-filled text");

    // Add first text manually (ignore pre-filled value)
    Textarea.input.clear();
    Textarea.type("First text{enter}");
    Textarea.hasValue("First text");

    // Add second text - this should reach maxSubmissions (2)
    Textarea.type("Second text{enter}");
    Textarea.hasValue("Second text");

    // Verify input is no longer visible (maxSubmissions reached)
    Textarea.input.should("not.exist");

    // Submit annotation - pre-filled value should not be added
    ToolBar.updateBtn.click();

    // Verify only the two manually added texts are in the result
    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(1);
      expect(result[0].value.text).to.deep.eq(["First text", "Second text"]);
    });
  });

  it("should auto-submit pre-filled value before reaching maxSubmissions", () => {
    LabelStudio.params().config(textareaConfigWithValueAndMaxSubmissions).data(simpleData).withResult([]).init();

    // Verify pre-filled value is in input
    Textarea.input.should("have.value", "Pre-filled text");

    // Add one text manually
    Textarea.type("{enter}"); // Submit the pre-filled value first
    Textarea.hasValue("Pre-filled text");

    // Add second text manually
    Textarea.type("Second text");

    // Now we have 1 submitted, 1 in input (not yet at max of 2)
    Textarea.input.should("have.value", "Second text");
    Textarea.input.should("be.visible");

    // Submit annotation - should auto-submit the second text
    ToolBar.updateBtn.click();

    // Verify input is not visible after submission because maxSubmissions is reached
    Textarea.input.should("not.exist");

    // Verify both texts are in the result
    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(1);
      expect(result[0].value.text).to.deep.eq(["Pre-filled text", "Second text"]);
    });
  });

  it("should not auto-submit when annotation is loaded with maxSubmissions already reached", () => {
    const existingResult = [
      {
        id: "result1",
        type: "textarea",
        from_name: "desc",
        to_name: "text",
        value: {
          text: ["First existing text", "Second existing text"],
        },
      },
    ];

    LabelStudio.params().config(textareaConfigWithMaxSubmissions).data(simpleData).withResult(existingResult).init();

    // Verify both texts are loaded
    Textarea.hasValue("First existing text");
    Textarea.hasValue("Second existing text");

    // Verify input is not visible (maxSubmissions=2 already reached)
    Textarea.input.should("not.exist");

    // Submit annotation - should not add any new text
    ToolBar.updateBtn.click();

    // Verify only the two existing texts remain in the result
    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(1);
      expect(result[0].value.text).to.deep.eq(["First existing text", "Second existing text"]);
    });
  });

  it("should not auto-submit pre-filled value when annotation is loaded with maxSubmissions already reached", () => {
    const existingResult = [
      {
        id: "result1",
        type: "textarea",
        from_name: "desc",
        to_name: "text",
        value: {
          text: ["First existing text", "Second existing text"],
        },
      },
    ];

    LabelStudio.params()
      .config(textareaConfigWithValueAndMaxSubmissions)
      .data(simpleData)
      .withResult(existingResult)
      .init();

    // Verify both texts are loaded
    Textarea.hasValue("First existing text");
    Textarea.hasValue("Second existing text");

    // Verify input is not visible (maxSubmissions=2 already reached)
    Textarea.input.should("not.exist");

    // Submit annotation - pre-filled value should not be added
    ToolBar.updateBtn.click();

    // Verify only the two existing texts remain, pre-filled value was not added
    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(1);
      expect(result[0].value.text).to.deep.eq(["First existing text", "Second existing text"]);
      // Ensure pre-filled text was not added
      expect(result[0].value.text).to.not.include("Pre-filled text");
    });
  });
});
