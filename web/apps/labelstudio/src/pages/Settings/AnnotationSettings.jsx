import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "@humansignal/ui";
import { useUpdatePageTitle, createTitleFromSegments } from "@humansignal/core";
import { Form, TextArea, Toggle } from "../../components/Form";
import { MenubarContext } from "../../components/Menubar/Menubar";
import { Block, Elem } from "../../utils/bem";

import { ModelVersionSelector } from "./AnnotationSettings/ModelVersionSelector";
import { ProjectContext } from "../../providers/ProjectProvider";
import { Divider } from "../../components/Divider/Divider";

export const AnnotationSettings = () => {
  const { project, fetchProject } = useContext(ProjectContext);
  const pageContext = useContext(MenubarContext);
  const formRef = useRef();
  const [collab, setCollab] = useState(null);

  useUpdatePageTitle(createTitleFromSegments([project?.title, "Annotation Settings"]));

  useEffect(() => {
    pageContext.setProps({ formRef });
  }, [formRef]);

  const updateProject = useCallback(() => {
    fetchProject(project.id, true);
  }, [project]);

  return (
    <Block name="annotation-settings">
      <Elem name={"wrapper"}>
        <h1>Annotation Settings</h1>
        <Block name="settings-wrapper">
          <Form
            ref={formRef}
            action="updateProject"
            formData={{ ...project }}
            params={{ pk: project.id }}
            onSubmit={updateProject}
          >
            <Form.Row columnCount={1}>
              <Elem name={"header"}>Labeling Instructions</Elem>
              <div class="settings-description">
                <p style={{ marginBottom: "0" }}>Write instructions to help users complete labeling tasks.</p>
                <p style={{ marginTop: "8px" }}>
                  The instruction field supports HTML markup and it allows use of images, iframes (pdf).
                </p>
              </div>
              <div>
                <Toggle label="Show before labeling" name="show_instruction" />
              </div>
              <TextArea name="expert_instruction" style={{ minHeight: 128, maxWidth: "520px" }} />
            </Form.Row>

            <Divider height={32} />

            <Form.Row columnCount={1}>
              <br />
              <Elem name={"header"}>Prelabeling</Elem>
              <div>
                <Toggle
                  label="Use predictions to prelabel tasks"
                  description={<span>Enable and select which set of predictions to use for prelabeling.</span>}
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
                <span case="success">Saved!</span>
              </Form.Indicator>
              <Button type="submit" look="primary" className="w-[150px]" aria-label="Save annotation settings">
                Save
              </Button>
            </Form.Actions>
          </Form>
        </Block>
      </Elem>
    </Block>
  );
};

AnnotationSettings.title = "Annotation";
AnnotationSettings.path = "/annotation";
