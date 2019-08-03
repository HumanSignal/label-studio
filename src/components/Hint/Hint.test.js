import React from "react";
import { shallow } from "enzyme";
import { shallowToJson } from "enzyme-to-json";

import Hint from "./Hint";

describe("Hint", () => {
  it("Should render correctly", () => {
    const output = shallow(
      <Hint copy="test" style={{ background: "red" }} className="test">
        Test
      </Hint>,
    );
    expect(shallowToJson(output)).toMatchSnapshot();
  });
});
