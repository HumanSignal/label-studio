import { useState, type FormEventHandler } from "react";
import { atomWithMutation, atomWithQuery, queryClientAtom } from "jotai-tanstack-query";
import { useAtomValue } from "jotai";
import { ToastType, useToast } from "@humansignal/ui";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { Button } from "apps/labelstudio/src/components/Button/Button";
import { Input, Label } from "apps/labelstudio/src/components/Form/Elements";

const HF_TOKEN_QUERY_KEY = ["huggingface-token-settings"];

const hfTokenSettingsAtom = atomWithQuery(() => ({
  queryKey: HF_TOKEN_QUERY_KEY,
  async queryFn() {
    return await API.invoke<{ configured: boolean }>("huggingFaceTokenSettings");
  },
}));

const saveHfTokenAtom = atomWithMutation((get) => {
  const queryClient = get(queryClientAtom);
  return {
    mutationKey: ["save-huggingface-token-settings"],
    async mutationFn({ token }: { token: string }) {
      return await API.invoke("huggingFaceTokenSettingsUpdate", {}, { body: { token } });
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: HF_TOKEN_QUERY_KEY });
    },
  };
});

const clearHfTokenAtom = atomWithMutation((get) => {
  const queryClient = get(queryClientAtom);
  return {
    mutationKey: ["clear-huggingface-token-settings"],
    async mutationFn() {
      return await API.invoke("huggingFaceTokenSettingsDelete");
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: HF_TOKEN_QUERY_KEY });
    },
  };
});

export const HuggingFaceTokenSettings = () => {
  const toast = useToast();
  const [token, setToken] = useState("");
  const tokenSettings = useAtomValue(hfTokenSettingsAtom);
  const saveToken = useAtomValue(saveHfTokenAtom);
  const clearToken = useAtomValue(clearHfTokenAtom);

  const configured = Boolean(tokenSettings.data?.configured);
  const isLoading = tokenSettings.isLoading || saveToken.isPending || clearToken.isPending;

  const onSubmit: FormEventHandler = async (e) => {
    e.preventDefault();
    const nextToken = token.trim();
    if (!nextToken) {
      toast.show({ message: "Please enter a Hugging Face token.", type: ToastType.error });
      return;
    }
    const response = await saveToken.mutateAsync({ token: nextToken });
    if (!response.$meta.ok) {
      toast.show({ message: response?.response?.detail ?? "Failed to save Hugging Face token.", type: ToastType.error });
      return;
    }
    setToken("");
    toast.show({ message: "Hugging Face token saved." });
  };

  const onClear = async () => {
    const response = await clearToken.mutateAsync();
    if (!response.$meta.ok) {
      toast.show({ message: response?.response?.detail ?? "Failed to clear Hugging Face token.", type: ToastType.error });
      return;
    }
    toast.show({ message: "Hugging Face token removed." });
  };

  return (
    <div id="huggingface-token">
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div>
          <Label text="Hugging Face Token" />
          <Input
            type="password"
            name="huggingface-token"
            placeholder={configured ? "Configured. Enter a new token to replace it." : "hf_..."}
            value={token}
            onChange={(e) => setToken(e.currentTarget.value)}
            readOnly={isLoading}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button look="primary" waiting={saveToken.isPending} disabled={isLoading}>
            Save
          </Button>
          <Button type="button" look="danger" onClick={onClear} disabled={!configured || isLoading}>
            Remove
          </Button>
          <span>{configured ? "Token configured" : "Token not configured"}</span>
        </div>
      </form>
    </div>
  );
};
