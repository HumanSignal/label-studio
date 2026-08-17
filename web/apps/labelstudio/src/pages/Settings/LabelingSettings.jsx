import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import { useProject } from "../../providers/ProjectProvider";
import { isEmptyString } from "../../utils/helpers";
import { ConfigPage } from "../CreateProject/Config/Config";

export const LabelingSettings = () => {
  const { project, updateProject } = useProject();
  const { t } = useTranslation();
  const [config, setConfig] = useState("");
  const [essentialDataChanged, setEssentialDataChanged] = useState(false);
  const hasChanges = config !== project.label_config;

  useUpdatePageTitle(createTitleFromSegments([project?.title, t("settings:labelingInterfacePageTitle")]));

  const saveConfig = useCallback(async () => {
    const res = await updateProject({
      label_config: config,
    });

    if (res?.$meta?.ok) {
      // Backend can prettify the config, so we need to update it to have relevant hasChanges value
      setConfig(res.label_config);
      return true;
    }

    //error handling
    return res.response;
  }, [project, config, updateProject]);

  const _projectAlreadySetUp = useMemo(() => {
    if (project.label_config) {
      const hasConfig = !isEmptyString(project.label_config);
      const configIsEmpty = project.label_config.replace(/\s/g, "") === "<View></View>";
      const hasTasks = project.task_number > 0;

      console.log({ hasConfig, configIsEmpty, hasTasks, project });
      return hasConfig && !configIsEmpty && hasTasks;
    }
    return false;
  }, [project]);

  const onSave = useCallback(async () => {
    return saveConfig();
  }, [essentialDataChanged, saveConfig]);

  const onUpdate = useCallback((config) => {
    setConfig(config);
  }, []);

  const onValidate = useCallback((validation) => {
    setEssentialDataChanged(validation.config_essential_data_has_changed);
  }, []);

  if (!project.id) return null;

  return (
    <ConfigPage
      config={project.label_config}
      project={project}
      onUpdate={onUpdate}
      onSaveClick={onSave}
      onValidate={onValidate}
      hasChanges={hasChanges}
    />
  );
};

// Route metadata is read by the routing/sidebar system outside of a React
// component, so it resolves through the shared i18next singleton lazily.
Object.defineProperty(LabelingSettings, "title", {
  get: () => i18next.t("settings:navLabelingInterface"),
});
LabelingSettings.path = "/labeling";
