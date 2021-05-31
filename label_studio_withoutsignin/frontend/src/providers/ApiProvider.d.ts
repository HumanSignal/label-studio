export function useAPI(): {
  callApi: (api: string, options: {
    params?: Record<string, unknown>,
    errorFilter?: (result: unknown) => boolean,
    body?: unknown,
  }) => unknown,
};
