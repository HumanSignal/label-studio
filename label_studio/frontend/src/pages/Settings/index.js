import React from "react";
import { SidebarMenu } from "../../components/SidebarMenu/SidebarMenu";
import { WebhookPage } from "../WebhookPage/WebhookPage";
import { DangerZone } from "./DangerZone";
import { GeneralSettings } from "./GeneralSettings";
import { InstructionsSettings } from "./InstructionsSettings";
import { LabelingSettings } from "./LabelingSettings";
import { MachineLearningSettings } from "./MachineLearningSettings/MachineLearningSettings";
import { StorageSettings } from "./StorageSettings/StorageSettings";
import { AppStoreContext } from "../../providers/AppStoreProvider";
import { admins } from "../../utils/constant";

export const MenuLayout = ({ children, ...routeProps }) => {
    const store = React.useContext(AppStoreContext);
    const currentUserEmail = store?.store?.userInfo?.email ?? "";
    if (admins.includes(currentUserEmail)) {
        return (
            <SidebarMenu
                menuItems={[
                    GeneralSettings,
                    LabelingSettings,
                    InstructionsSettings,
                    MachineLearningSettings,
                    StorageSettings,
                    WebhookPage,
                    DangerZone,
                ]}
                path={routeProps.match.url}
                children={children}
            />
        );
    }
    return (
        <div style={{ fontSize: 25, display: "flex", justifyContent: "center", alignItems: "center" }}>
            You don't have access to project's setting page
        </div>
    );
};

export const SettingsPage = {
    title: "Settings",
    path: "/settings",
    exact: true,
    layout: MenuLayout,
    component: GeneralSettings,
    pages: {
        InstructionsSettings,
        LabelingSettings,
        MachineLearningSettings,
        StorageSettings,
        WebhookPage,
        DangerZone,
    },
};
