export interface Meta {
  headers: Map<string, string>;
  status: number;
  url: string;
  ok: boolean;
}

export type WrappedResponse<T = unknown> = T & {
  $meta: Meta;
};

export type Unwrap<P> = P extends WrappedResponse<infer T> ? T : never;

export function useAPI(): {
  callApi: <T = unknown>(
    api: string,
    options?: {
      params?: Record<string, unknown>;
      errorFilter?: (result: unknown) => boolean;
      body?: FormData | Record<string, any>;
    },
  ) => Promise<WrappedResponse<T>>;
};
