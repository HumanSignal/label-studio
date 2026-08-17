import { Badge, Button, Select, Typography, Tooltip, EnterpriseBadge } from "@humansignal/ui";
import { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { IconSpark } from "@humansignal/icons";
import { Form, Input, TextArea } from "../../components/Form";
import { RadioGroup } from "../../components/Form/Elements/RadioGroup/RadioGroup";
import { ProjectContext } from "../../providers/ProjectProvider";
import { cn } from "../../utils/bem";
import { HeidiTips } from "../../components/HeidiTips/HeidiTips";
import { FF_LSDV_E_297, isFF } from "../../utils/feature-flags";
import { createURL } from "../../components/HeidiTips/utils";

export const GeneralSettings = () => {
  const { project, fetchProject } = useContext(ProjectContext);
  const { t } = useTranslation();

  const updateProject = useCallback(() => {
    if (project.id) fetchProject(project.id, true);
  }, [project]);

  const colors = ["#FDFDFC", "#FF4C25", "#FF750F", "#ECB800", "#9AC422", "#34988D", "#617ADA", "#CC6FBE"];

  const samplings = [
    {
      value: "Sequential sampling",
      labelKey: "settings:sequentialSampling",
      descriptionKey: "settings:samplingSequentialDesc",
    },
    {
      value: "Uniform sampling",
      labelKey: "settings:randomSampling",
      descriptionKey: "settings:samplingRandomDesc",
    },
  ];

  return (
    <div className={cn("general-settings").toClassName()}>
      <div className={cn("general-settings").elem("wrapper").toClassName()}>
        <h1>{t("settings:generalSettingsTitle")}</h1>
        <div className={cn("settings-wrapper").toClassName()}>
          <Form action="updateProject" formData={{ ...project }} params={{ pk: project.id }} onSubmit={updateProject}>
            <Form.Row columnCount={1} rowGap="16px">
              <Input name="title" label={t("projects:projectName")} />

              <TextArea name="description" label={t("projects:description")} style={{ minHeight: 128 }} />
              {isFF(FF_LSDV_E_297) && (
                <div className={cn("workspace-placeholder").toClassName()}>
                  <div className={cn("workspace-placeholder").elem("badge-wrapper").toClassName()}>
                    <div className={cn("workspace-placeholder").elem("title").toClassName()}>
                      {t("projects:workspace")}
                    </div>
                    <EnterpriseBadge size="small" className="ml-2" />
                  </div>
                  <Select placeholder={t("projects:selectAnOption")} disabled options={[]} />
                  <Typography size="small" className="my-tight">
                    {t("projects:workspaceHint")}{" "}
                    <a
                      target="_blank"
                      href={createURL(
                        "https://docs.humansignal.com/guide/manage_projects#Create-workspaces-to-organize-projects",
                        {
                          experiment: "project_settings_tip",
                          treatment: "simplify_project_management",
                        },
                      )}
                      rel="noreferrer"
                      className="underline hover:no-underline"
                    >
                      {t("settings:learnMore")}
                    </a>
                  </Typography>
                </div>
              )}
              <RadioGroup name="color" label={t("settings:colorLabel")} size="large" labelProps={{ size: "large" }}>
                {colors.map((color) => (
                  <RadioGroup.Button key={color} value={color}>
                    <div className={cn("color").toClassName()} style={{ "--background": color }} />
                  </RadioGroup.Button>
                ))}
              </RadioGroup>

              <RadioGroup label={t("settings:taskSamplingLabel")} labelProps={{ size: "large" }} name="sampling" simple>
                {samplings.map(({ value, labelKey, descriptionKey }) => (
                  <RadioGroup.Button key={value} value={value} label={t(labelKey)} description={t(descriptionKey)} />
                ))}
                {isFF(FF_LSDV_E_297) && (
                  <RadioGroup.Button
                    key="uncertainty-sampling"
                    value=""
                    label={
                      <>
                        {t("settings:uncertaintySampling")}{" "}
                        <Tooltip title={t("settings:availableOnEnterprise")}>
                          <Badge
                            variant="enterprise"
                            icon={<IconSpark />}
                            size="small"
                            look="ghost"
                            className="ml-tightest"
                          />
                        </Tooltip>
                      </>
                    }
                    disabled
                    description={
                      <>
                        {t("settings:uncertaintySamplingDesc")}{" "}
                        <a
                          target="_blank"
                          href={createURL("https://docs.humansignal.com/guide/active_learning", {
                            experiment: "project_settings_workspace",
                            treatment: "workspaces",
                          })}
                          rel="noreferrer"
                        >
                          {t("settings:learnMore")}
                        </a>
                      </>
                    }
                  />
                )}
              </RadioGroup>
            </Form.Row>

            <Form.Actions>
              <Form.Indicator>
                <span case="success">{t("settings:savedIndicator")}</span>
              </Form.Indicator>
              <Button type="submit" className="w-[150px]" aria-label={t("settings:saveGeneralSettingsAria")}>
                {t("settings:saveButton")}
              </Button>
            </Form.Actions>
          </Form>
        </div>
      </div>
      {isFF(FF_LSDV_E_297) && <HeidiTips collection="projectSettings" />}
    </div>
  );
};

// Route metadata is read by the routing/sidebar system outside of a React
// component, so it resolves through the shared i18next singleton lazily.
Object.defineProperty(GeneralSettings, "menuItem", {
  get: () => i18next.t("settings:navGeneral"),
});
GeneralSettings.path = "/";
GeneralSettings.exact = true;
