import { describe, expect, it } from "bun:test";
import { LSFWrapper } from "../lsf-sdk";

class CapturingLSF extends LSFWrapper {
  initLabelStudio(settings) {
    this.settings = settings;
  }
}

const dataManager = (projectId) => ({
  store: {
    project: { id: projectId, instruction: "" },
    users: [],
    labelingConfig: "<View></View>",
  },
  hasInterface: () => false,
});

describe("LSFWrapper project", () => {
  it("passes the Data Manager project id into the editor store", () => {
    const wrapper = new CapturingLSF(dataManager(42), document.createElement("div"), {
      task: { id: 1, data: {}, project: 42 },
      user: { id: 1 },
    });

    expect(wrapper.settings.project).toEqual({ id: 42 });
  });
});
