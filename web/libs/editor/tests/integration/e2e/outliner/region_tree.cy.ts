import { LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";

describe("Outliner - Regions tree", () => {
  const text = "a".repeat(30);
  const config =
    '<View><Text name="text" value="$text"/><Labels name="labels" toName="text"><Label value="Label_1" /></Labels></View>';
  const result = text.split("").map((val, idx) => {
    return {
      value: {
        start: idx,
        end: idx + 1,
        text: val,
        labels: ["Label_1"],
      },
      id: `id_${idx}`,
      from_name: "labels",
      to_name: "text",
      type: "labels",
      origin: "manual",
    };
  });

  it("shouldn't show all of the regions at the regions list due to virtualization", () => {
    LabelStudio.params().config(config).data({ text }).withResult(result).init();

    Sidebar.regions.eq(15).should("not.exist");
  });
});
