import React from "react";
import { useSDK } from "../../providers/SDKProvider";
import { Button } from "./Button/Button";

const SDKButton = ({ eventName, ...props }) => {
  const sdk = useSDK();

  return sdk.hasHandler(eventName) ? (
    <Button
      {...props}
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
  return <SDKButton {...props} eventName="importClicked" />;
};

export const ExportButton = ({ ...props }) => {
  return <SDKButton {...props} eventName="exportClicked" />;
};
