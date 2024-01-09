/* global test, expect, jest */
import Enzyme, { render } from "enzyme";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import { HtxHeader } from "../Header";

Enzyme.configure({ adapter: new Adapter() });

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useLayoutEffect: jest.requireActual('react').useEffect,
}));

test("Header basic test", () => {
  const confStore = {
    _value: "header text",
    underline: true,
    size: 1,
  };

  const view = render(<HtxHeader item={confStore} />);
  const text = view.text();

  expect(text).toBe("header text");
});
