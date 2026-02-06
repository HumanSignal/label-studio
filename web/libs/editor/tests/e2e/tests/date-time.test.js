const assert = require("assert");
const { serialize, selectText } = require("./helpers");

Feature("Date Time");

const config = `<View>
<style>
[data-radix-popper-content-wrapper] {
  z-index: 9999 !important;
}
</style>
<Header>Select text to see related smaller DateTime controls for every region</Header>
<Labels name="label" toName="text">
  <Label value="birth" background="green"/>
  <Label value="death" background="red"/>
  <Label value="event" background="orange"/>
</Labels>
<Text name="text" value="$text"/>
<DateTime name="created" toName="text" required="true" only="date" format="%d.%m.%Y" min="1988-01-13" max="1999-12-31"/>
<View visibleWhen="region-selected">
  <Header>Date in this fragment, required, stored as ISO date</Header>
  <DateTime name="date" toName="text" perRegion="true" only="date" required="true" format="%Y-%m-%d"/>
  <Header>Year this happened, but stored also as ISO date</Header>
  <DateTime name="year" toName="text" perRegion="true" only="year" format="%Y-%m-%d" min="2020" max="2022"/>
</View>
</View>
`;

const data = {
  text: 'Albert Einstein (/ˈaɪnstaɪn/ EYEN-styne;[6] German: [ˈalbɛʁt ˈʔaɪnʃtaɪn] (listen); 14 March 1879 – 18 April 1955) was a German-born theoretical physicist,[7] widely acknowledged to be one of the greatest and most influential physicists of all time. Einstein is best known for developing the theory of relativity, but he also made important contributions to the development of the theory of quantum mechanics. Relativity and quantum mechanics are together the two pillars of modern physics.[3][8] His mass–energy equivalence formula E = mc2, which arises from relativity theory, has been dubbed "the world\'s most famous equation".[9] His work is also known for its influence on the philosophy of science.[10][11] He received the 1921 Nobel Prize in Physics "for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect",[12] a pivotal step in the development of quantum theory. His intellectual achievements and originality resulted in "Einstein" becoming synonymous with "genius".[13]',
};

const createdDate = {
  incorrectMin: "1988-01-12",
  correctMin: "1988-01-13",
  incorrectMax: "2000-01-01",
  correctMax: "1999-12-31",
  result: "31.12.1999",
};

const regions = [
  { label: "birth", rangeStart: 83, rangeEnd: 96, text: "14 March 1879", dateValue: "1879-03-14", year: "2022" },
  { label: "death", rangeStart: 99, rangeEnd: 112, text: "18 April 1955", dateValue: "1955-04-18", year: "2021" },
  {
    label: "event",
    rangeStart: 728,
    rangeEnd: 755,
    text: "1921 Nobel Prize in Physics",
    dateValue: "1921-10-10",
    year: "2020",
  },
];

/**
 * Programmatically set a date input's value using ISO format (YYYY-MM-DD).
 * This bypasses locale-dependent keyboard behavior in browser date inputs,
 * ensuring the test works identically regardless of system locale or timezone.
 */
const fillDateInput = async (I, selector, isoDate) => {
  await I.executeScript(
    ({ selector, value }) => {
      const input = document.querySelector(selector);

      // Use the native HTMLInputElement value setter to bypass
      // React's controlled input value tracking
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

      nativeInputValueSetter.call(input, value);

      // Reset React's internal value tracker so it detects the change
      if (input._valueTracker) {
        input._valueTracker.setValue("");
      }

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { selector, value: isoDate },
  );
};

const params = { config, data };

Scenario(
  "Check DateTime holds state between annotations and saves result",
  async ({ I, AtLabels, AtOutliner, LabelStudio, Modals }) => {
    I.amOnPage("/");

    LabelStudio.init(params);

    ////// GLOBAL
    I.say("Check validation of required global date control");
    I.updateAnnotation();
    Modals.seeWarning('DateTime "created" is required');
    Modals.closeWarning();
    Modals.dontSeeWarning('DateTime "created" is required');

    const checks = {
      incorrect: [
        [createdDate.incorrectMin, "min date is 1988-01-13"],
        [createdDate.incorrectMax, "max date is 1999-12-31"],
      ],
      correct: [[createdDate.correctMin], [createdDate.correctMax]],
    };

    for (const [incorrect, error] of checks.incorrect) {
      await fillDateInput(I, "input[type=date]", incorrect);
      I.updateAnnotation();
      Modals.seeWarning("is not valid");
      Modals.seeWarning(error);
      Modals.closeWarning();
      Modals.dontSeeWarning("is not valid");
      assert.strictEqual(await I.grabCssPropertyFrom("[type=date]", "border-color"), "rgb(255, 0, 0)");
    }

    for (const [correct] of checks.correct) {
      await fillDateInput(I, "input[type=date]", correct);
      I.updateAnnotation();
      Modals.dontSeeWarning("is not valid");
    }

    // this value will be asserted at the end
    await fillDateInput(I, "input[type=date]", createdDate.correctMax);

    ////// PER-REGION
    I.say("Create regions but leave dates empty");
    for (const region of regions) {
      AtLabels.clickLabel(region.label);
      AtLabels.seeSelectedLabel(region.label);
      await I.executeScript(selectText, {
        selector: ".lsf-htx-richtext",
        rangeStart: region.rangeStart,
        rangeEnd: region.rangeEnd,
      });
      I.pressKey("Escape");
      // to prevent from double-click region handling (its timeout is 0.45s)
      I.wait(0.5);
    }

    I.say("Try to submit and observe validation errors about per-regions");
    I.updateAnnotation();
    Modals.seeWarning('DateTime "date" is required');
    Modals.closeWarning();
    Modals.dontSeeWarning('DateTime "date" is required');

    // invalid region is selected on validation to reveal per-region control with error
    AtOutliner.seeSelectedRegion(regions[0].label);
    await fillDateInput(I, "input[name=date-date]", regions[0].dateValue);
    I.updateAnnotation();
    // next region with empty required date is selected and error is shown
    Modals.seeWarning('DateTime "date" is required');
    Modals.closeWarning();
    Modals.dontSeeWarning('DateTime "date" is required');
    AtOutliner.seeSelectedRegion(regions[1].label);

    I.say("Fill all per-region date fields and check it's all good");
    for (const region of regions) {
      AtOutliner.clickRegion(region.text);
      await fillDateInput(I, "input[name=date-date]", region.dateValue);
    }

    AtOutliner.clickRegion(regions[0].text);
    // less than min
    I.click(locate("[data-testid*=select-trigger][data-name=year-year]"));
    I.dontSee("1999");
    // less than max
    I.dontSee("2023");
    I.see("2022");
    // exactly the same as max, should be correct
    I.click("div[data-testid='select-option-2022']");
    assert.strictEqual("2022", await I.grabValueFrom("select[name=year-year]"));
    I.pressKey("Escape");

    regions.forEach((region) => {
      AtOutliner.clickRegion(region.text);
      I.selectOption("select[name=year-year]", region.year);
    });

    I.updateAnnotation();
    Modals.dontSeeWarning("is required");

    regions.forEach((region) => {
      AtOutliner.clickRegion(region.text);
      // important to see that per-regions change their values
      I.seeInField("input[name=date-date]", region.dateValue);
      I.seeInField("select[name=year-year]", region.year);
    });

    const results = await I.executeScript(serialize);

    results
      .filter((result) => result.value.start)
      .forEach((result) => {
        const input = regions.find((reg) => reg.text === result.value.text);
        const expected = { end: input.rangeEnd, start: input.rangeStart, text: input.text };

        switch (result.from_name) {
          case "label":
            expected.labels = [input.label];
            break;
          case "date":
            expected.datetime = input.dateValue;
            break;
          // year is formatted in config to be an ISO date
          case "year":
            expected.datetime = `${input.year}-01-01`;
            break;
        }

        assert.deepStrictEqual(result.value, expected);
      });

    assert.strictEqual(results[0].value.datetime, createdDate.result);
  },
);
