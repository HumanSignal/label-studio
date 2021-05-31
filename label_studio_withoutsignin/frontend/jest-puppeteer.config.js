module.exports = {
  launch: {
    headless: process.env.HEADLESS !== 'false',
  },
  browserContext: 'incognito',
};
