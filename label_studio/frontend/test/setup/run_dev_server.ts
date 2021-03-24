export const runTestServer = async () => {
  const RUNNING = 'Starting development server at';

  return {
    shutdown: async() => {
      return true;
    },
  };
};
