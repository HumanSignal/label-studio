/* global describe, it, expect */
import React from "react";
import Enzyme, { shallow } from "enzyme";
import { shallowToJson } from "enzyme-to-json";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";

Enzyme.configure({ adapter: new Adapter() });

import Hint from "./Hint";

describe("Hint", () => {
  it("Should render correctly", () => {
    const component = (
      <Hint copy="test" style={{ background: "red" }} className="test">
        Test
      </Hint>
    );

    const output = shallow(component);

    expect(shallowToJson(output)).toMatchSnapshot();
  });
});
