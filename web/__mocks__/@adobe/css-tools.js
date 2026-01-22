module.exports = {
  parse: jest.fn(() => ({ stylesheet: { rules: [] } })),
  stringify: jest.fn(() => ""),
};
