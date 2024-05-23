import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF";

describe("Label Studio UI init", () => {
  it("Initialize empty Label Studio", () => {
    LabelStudio.init({
      config: "<View></View>",
      task: {
        annotations: [],
        predictions: [],
        id: 1,
        data: {
          image:
            "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
        },
      },
    });
  });

  it("Initialize Label Studio", () => {
    LabelStudio.init({
      config: "<View></View>",
      task: {
        annotations: [{ id: 1, result: [] }],
        predictions: [],
        id: 1,
        data: {
          image:
            "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
        },
      },
    });
  });
});
