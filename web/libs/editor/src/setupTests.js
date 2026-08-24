/**
 * Initializing Test Environment
 */

const localStorageMock = {
  getItem: mock(),
  setItem: mock(),
  removeItem: mock(),
  clear: mock(),
};

global.localStorage = localStorageMock;
