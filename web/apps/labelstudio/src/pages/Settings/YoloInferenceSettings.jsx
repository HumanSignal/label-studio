import { useCallback, useContext, useMemo, useRef } from "react";
import { Button } from "../../components";
import { Description } from "../../components/Description/Description";
import { Form, Label, Toggle } from "../../components/Form";
import { Divider } from "../../components/Divider/Divider";
import { Block, Elem } from "../../utils/bem";
import { ModelVersionSelector } from "./AnnotationSettings/ModelVersionSelector";
import { ProjectContext } from "../../providers/ProjectProvider";

export const YoloInferenceSettings = () => {
  const { project, fetchProject } = useContext(ProjectContext);
  const formRef = useRef();

  const updateProject = useCallback(() => {
    fetchProject(project.id, true);
  }, [fetchProject, project.id]);

  const helperText = useMemo(() => {
    if (!project?.model_version) {
      return "No active inference model is selected.";
    }
    return `Current active inference model/predictions: ${project.model_version}`;
  }, [project?.model_version]);

  return (
    <Block name="yolo-inference-settings">
      <Elem name={"wrapper"}>
        <h1>YOLO Inference</h1>
        <Block name="settings-wrapper">
          <Form
            ref={formRef}
            action="updateProject"
            formData={{ ...project }}
            params={{ pk: project.id }}
            onSubmit={updateProject}
          >
            <Form.Row columnCount={1}>
              <Label text="Inference Source" large />
              <Description style={{ marginTop: 0, maxWidth: 760 }}>
                Configure which live model or prediction set is used for prelabeling and uncertainty-driven task
                ordering. For YOLO workflows, select your trained YOLO backend title here.
              </Description>
              <Description style={{ marginTop: 0 }}>{helperText}</Description>
              <div>
                <Toggle
                  label="Use predictions to prelabel tasks"
                  description="Enable predictions in labeling UI."
                  name="show_collab_predictions"
                />
              </div>
              <ModelVersionSelector />
              <div>
                <Toggle
                  label="Reveal interactive preannotations"
                  description="Keep this enabled if you still want SAM interactive assist while YOLO remains the inference source."
                  name="reveal_preannotations_interactively"
                />
              </div>
            </Form.Row>

            <Divider height={32} />

            <Form.Row columnCount={1}>
              <Label text="Task Sampling" large />
              <Description style={{ marginTop: 0, maxWidth: 760 }}>
                Set project sampling mode to Uncertainty sampling in General settings if you want active-learning
                prioritization driven by this selected inference model.
              </Description>
            </Form.Row>

            <Form.Actions>
              <Form.Indicator>
                <span case="success">Saved!</span>
              </Form.Indicator>
              <Button type="submit" look="primary" style={{ width: 120 }}>
                Save
              </Button>
            </Form.Actions>
          </Form>
        </Block>
      </Elem>
    </Block>
  );
};

YoloInferenceSettings.title = "YOLO Inference";
YoloInferenceSettings.path = "/yolo-inference";
