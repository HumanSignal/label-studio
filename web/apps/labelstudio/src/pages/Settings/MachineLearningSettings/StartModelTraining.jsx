import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@humansignal/ui";
import { useAPI } from "../../../providers/ApiProvider";
import { Typography } from "@humansignal/ui";

export const StartModelTraining = ({ backend }) => {
  const api = useAPI();
  const { t } = useTranslation();
  const [response, setResponse] = useState(null);

  const onStartTraining = useCallback(
    async (backend) => {
      const res = await api.callApi("trainMLBackend", {
        params: {
          pk: backend.id,
        },
      });

      setResponse(res.response || {});
    },
    [api],
  );

  return (
    <div className="max-w-[680px]">
      <Typography size="small" className="text-neutral-content-subtler">
        {t("settings:startTrainingIntro")}
      </Typography>
      <Typography size="small" className="text-neutral-content-subtler mt-base mb-wide">
        {t("settings:startTrainingNote")}
      </Typography>

      {!response && (
        <Button
          onClick={() => {
            onStartTraining(backend);
          }}
        >
          {t("settings:startTrainingMenuItem")}
        </Button>
      )}

      {!!response && (
        <>
          <pre>{t("settings:requestSent")}</pre>
          <pre>
            {t("settings:responseLabel")} {JSON.stringify(response, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
};
