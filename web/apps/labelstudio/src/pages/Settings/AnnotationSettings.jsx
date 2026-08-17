import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "@humansignal/ui";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import { Form, TextArea, Toggle } from "../../components/Form";
import { MenubarContext } from "../../components/Menubar/Menubar";
import { cn } from "../../utils/bem";

import { ModelVersionSelector } from "./AnnotationSettings/ModelVersionSelector";
import { ProjectContext } from "../../providers/ProjectProvider";
import { Divider } from "../../components/Divider/Divider";

export const AnnotationSettings = () => {
  const { project, fetchProject } = useContext(ProjectContext);
  const pageContext = useContext(MenubarContext);
  const { t } = useTranslation();
  const formRef = useRef();
  const [collab, setCollab] = useState(null);

  useUpdatePageTitle(createTitleFromSegments([project?.title, t("settings:annotationSettingsPageTitle")]));

  useEffect(() => {
    pageContext.setProps({ formRef });
  }, [formRef]);

  const updateProject = useCallback(() => {
    fetchProject(project.id, true);
  }, [project]);

  return (
    <div className={cn("annotation-settings").toClassName()}>
      <div className={cn("annotation-settings").elem("wrapper").toClassName()}>
        <h1>{t("settings:annotationSettingsPageTitle")}</h1>
        <div className={cn("settings-wrapper").toClassName()}>
          <Form
            ref={formRef}
            action="updateProject"
            formData={{ ...project }}
            params={{ pk: project.id }}
            onSubmit={updateProject}
          >
            <Form.Row columnCount={1}>
              <div className={cn("settings-wrapper").elem("header").toClassName()}>
                {t("settings:labelingInstructionsHeader")}
              </div>
              <div class="settings-description">
                <p style={{ marginBottom: "0" }}>{t("settings:labelingInstructionsHelp1")}</p>
                <p style={{ marginTop: "8px" }}>{t("settings:labelingInstructionsHelp2")}</p>
              </div>
              <div>
                <Toggle label={t("settings:showBeforeLabeling")} name="show_instruction" />
              </div>
              <TextArea name="expert_instruction" style={{ minHeight: 128, maxWidth: "520px" }} />
            </Form.Row>

            <Divider height={32} />

            <Form.Row columnCount={1}>
              <br />
              <div className={cn("settings-wrapper").elem("header").toClassName()}>
                {t("settings:prelabelingHeader")}
              </div>
              <div>
                <Toggle
                  label={t("settings:usePredictionsToPrelabel")}
                  description={<span>{t("settings:usePredictionsToPrelabelDesc")}</span>}
                  name="show_collab_predictions"
                  onChange={(e) => {
                    setCollab(e.target.checked);
                  }}
                />
              </div>

              {(collab !== null ? collab : project.show_collab_predictions) && <ModelVersionSelector />}
            </Form.Row>

            <Form.Actions>
              <Form.Indicator>
                <span case="success">{t("settings:savedIndicator")}</span>
              </Form.Indicator>
              <Button
                type="submit"
                look="primary"
                className="w-[150px]"
                aria-label={t("settings:saveAnnotationSettingsAria")}
              >
                {t("settings:saveButton")}
              </Button>
            </Form.Actions>
          </Form>
        </div>
      </div>
    </div>
  );
};

// Route metadata is read by the routing/sidebar system outside of a React
// component, so it resolves through the shared i18next singleton lazily.
Object.defineProperty(AnnotationSettings, "title", {
  get: () => i18next.t("settings:navAnnotation"),
});
AnnotationSettings.path = "/annotation";
