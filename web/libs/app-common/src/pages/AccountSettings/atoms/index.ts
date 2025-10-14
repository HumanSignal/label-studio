import { getApiInstance } from "@humansignal/core";
import { atomWithQuery } from "jotai-tanstack-query";

type AuthTokenSettings = {
  api_tokens_enabled: boolean;
  legacy_api_tokens_enabled: boolean;
  api_token_ttl_days: number;
};

export const TOKEN_SETTINGS_KEY = "api-settings";

export const settingsAtom = atomWithQuery(() => ({
  queryKey: [TOKEN_SETTINGS_KEY],
  async queryFn() {
    const api = getApiInstance();
    const result = await api.invoke<AuthTokenSettings>("accessTokenSettings");

    if (!result.$meta.ok) {
      return { error: true };
    }

    return result;
  },
}));
