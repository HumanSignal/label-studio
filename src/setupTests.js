/**
 * Initializing Test Environment
 */

import { configure } from "enzyme";
import Adapter from "enzyme-adapter-react-16";

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock;

configure({ adapter: new Adapter() });
