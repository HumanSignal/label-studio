import React from "react";
import { shallow } from "enzyme";
import { shallowToJson } from "enzyme-to-json";

import Settings from "./Settings";

describe("Settings Component", () => {
  it("Should render correctly", () => {
    const output = shallow(<Settings store={{ showingSettings: true, settings: { enableHotkeys: true } }} />);
    expect(shallowToJson(output)).toMatchSnapshot();
  });
});
