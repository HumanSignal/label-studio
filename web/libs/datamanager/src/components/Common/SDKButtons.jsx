import { useTranslation } from "react-i18next";
import { useSDK } from "../../providers/SDKProvider";
import { Button } from "@humansignal/ui";

const ARIA_KEY_BY_EVENT = {
  importClicked: "dataManager:import",
  exportClicked: "dataManager:export",
  settingsClicked: "projects:settings",
};

const SDKButton = ({ eventName, testId, ...props }) => {
  const sdk = useSDK();
  const { t } = useTranslation();
  const ariaKey = ARIA_KEY_BY_EVENT[eventName];

  return sdk.hasHandler(eventName) ? (
    <Button
      {...props}
      size={props.size ?? "small"}
      look={props.look ?? "outlined"}
      variant={props.variant ?? "neutral"}
      aria-label={ariaKey ? t(ariaKey) : `${eventName.replace("Clicked", "")} button`}
      data-testid={testId}
      onClick={() => {
        sdk.invoke(eventName);
      }}
    />
  ) : null;
};

export const SettingsButton = ({ ...props }) => {
  return <SDKButton {...props} eventName="settingsClicked" />;
};

export const ImportButton = ({ ...props }) => {
  return <SDKButton {...props} eventName="importClicked" testId="dm-import-button" />;
};

export const ExportButton = ({ ...props }) => {
  return <SDKButton {...props} eventName="exportClicked" testId="dm-export-button" />;
};
