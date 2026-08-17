import { useCopyText } from "@humansignal/core";
import { ArrowSquareOutIcon, CopyIcon } from "@humansignal/icons";
import { Button, Label, Typography } from "@humansignal/ui";
import { useTranslation } from "react-i18next";
/**
 * FIXME: This is legacy imports. We're not supposed to use such statements
 * each one of these eventually has to be migrated to core/ui
 */
import { Input, TextArea } from "apps/labelstudio/src/components/Form";
import { atom, useAtomValue } from "jotai";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import styles from "./PersonalAccessToken.module.css";

const tokenAtom = atomWithQuery(() => ({
  queryKey: ["access-token"],
  queryFn: async () => {
    const result = await fetch("/api/current-user/token");
    return result.json();
  },
}));

const resetTokenAtom = atomWithMutation(() => ({
  mutationKey: ["reset-token"],
  mutationFn: async () => {
    const result = await fetch("/api/current-user/reset-token", {
      method: "post",
    });
    return result.json();
  },
}));

const currentTokenAtom = atom((get) => {
  const initialToken = get(tokenAtom).data?.token;
  const resetToken = get(resetTokenAtom).data?.token;

  return resetToken ?? initialToken;
});

const curlStringAtom = atom((get) => {
  const currentToken = get(currentTokenAtom);
  const curlString = `curl -X GET ${location.origin}/api/projects/ -H 'Authorization: Token ${currentToken}'`;
  return curlString;
});

export const PersonalAccessToken = () => {
  const { t } = useTranslation();
  const token = useAtomValue(currentTokenAtom);
  const reset = useAtomValue(resetTokenAtom);
  const curl = useAtomValue(curlStringAtom);
  const [copyToken, tokenCopied] = useCopyText({ defaultText: token });
  const [copyCurl, curlCopied] = useCopyText({ defaultText: curl });

  return (
    <div id="personal-access-token">
      <div className="flex flex-col gap-6">
        <div>
          <Label text={t("account:accountAccessTokenLabel")} className={styles.label} />
          <div className="flex gap-2 w-full justify-between">
            <Input name="token" className={styles.input} readOnly value={token ?? ""} />
            <Button
              leading={<CopyIcon />}
              onClick={() => copyToken()}
              disabled={tokenCopied}
              variant="primary"
              look="outlined"
              className="w-[116px]"
            >
              {tokenCopied ? t("account:commonCopied") : t("account:commonCopy")}
            </Button>
            <Button variant="negative" look="outlined" onClick={() => reset.mutate()}>
              {t("account:commonReset")}
            </Button>
          </div>
        </div>
        <div>
          <Label text={t("account:accountExampleCurlRequest")} className={styles.label} />
          <div className="flex gap-2 w-full justify-between">
            <TextArea
              name="example-curl"
              readOnly
              className={styles.textarea}
              rawClassName={styles.textarea}
              value={curl ?? ""}
            />
            <Button
              leading={<CopyIcon />}
              onClick={() => copyCurl()}
              disabled={curlCopied}
              variant="primary"
              look="outlined"
              className="w-[116px]"
            >
              {curlCopied ? t("account:commonCopied") : t("account:commonCopy")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function PersonalAccessTokenDescription() {
  const { t } = useTranslation();

  return (
    <Typography>
      {t("account:accountTokenSectionDescription")}
      {!window.APP_SETTINGS?.whitelabel_is_active && (
        <>
          {" "}
          {t("account:commonSee")}{" "}
          <a href="https://labelstud.io/guide/api.html" target="_blank" rel="noreferrer" className="inline-flex gap-1">
            {t("account:commonDocs")}{" "}
            <span>
              <ArrowSquareOutIcon size={20} />
            </span>
          </a>
        </>
      )}
    </Typography>
  );
}
