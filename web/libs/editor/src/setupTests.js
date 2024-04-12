/**
 * Initializing Test Environment
 */
/* global jest, global */

import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import { configure } from "enzyme";

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock;

configure({ adapter: new Adapter() });
