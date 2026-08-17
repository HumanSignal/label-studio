import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@humansignal/ui";
import { useAPI } from "../../../providers/ApiProvider";
import { Typography } from "@humansignal/ui";

export const TestRequest = ({ backend }) => {
  const api = useAPI();
  const { t } = useTranslation();
  const [testResponse, setTestResponse] = useState({});
  console.log(testResponse.url);

  const sendTestRequest = useCallback(
    async (backend) => {
      const response = await api.callApi("predictWithML", {
        params: {
          pk: backend.id,
          random: true,
        },
      });

      if (response) setTestResponse(response);
    },
    [setTestResponse],
  );

  return (
    <section>
      <Button
        onClick={() => {
          sendTestRequest(backend);
        }}
      >
        {t("settings:sendRequestButton")}
      </Button>
      <Typography size="smaller" className="my-tight">
        {t("settings:testRequestDescription")}
      </Typography>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Typography variant="title" size="medium">
            {t("settings:requestTitle")}
          </Typography>
          <div className="bg-neutral-surface rounded-md p-tight overflow-y-scroll max-h-[400px] min-h-[90px]">
            <pre className="whitespace-pre-wrap break-words text-body-small">
              {testResponse.url && `POST ${testResponse.url}\n\n${JSON.stringify(testResponse.request, null, 2)}`}
            </pre>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Typography variant="title" size="medium">
            {t("settings:responseTitle")}
          </Typography>
          <div className="bg-neutral-surface rounded-md p-tight overflow-y-scroll max-h-[400px] min-h-[90px]">
            <pre className="whitespace-pre-wrap break-words text-body-small">
              {testResponse.status && `${testResponse.status}\n\n${JSON.stringify(testResponse.response, null, 2)}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
