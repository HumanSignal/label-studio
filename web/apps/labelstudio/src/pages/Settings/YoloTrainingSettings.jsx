import { useContext, useMemo } from "react";
import { Button } from "../../components";
import { Description } from "../../components/Description/Description";
import { Form, Toggle } from "../../components/Form";
import { ProjectContext } from "../../providers/ProjectProvider";
import { useAPI } from "../../providers/ApiProvider";
import { Block, Elem } from "../../utils/bem";
import { ModelVersionSelector } from "./AnnotationSettings/ModelVersionSelector";

export const YoloTrainingSettings = () => {
  const api = useAPI();
  const { project, fetchProject } = useContext(ProjectContext);

  const updateProject = async () => {
    await fetchProject(project.id, true);
  };

  const trainingBackend = useMemo(() => project.training_backend || null, [project.training_backend]);

  const onStartTraining = async () => {
    if (!trainingBackend) return;
    const mlBackends = await api.callApi("mlBackends", {
      params: { project: project.id },
    });
    const backend = (mlBackends ?? []).find((item) => item.title === trainingBackend);
    if (!backend) return;
    await api.callApi("trainMLBackend", { params: { pk: backend.id } });
  };

  return (
    <Block name="annotation-settings">
      <Elem name={"wrapper"}>
        <h1>YOLO Training</h1>
        <Block name="settings-wrapper">
          <Form action="updateProject" formData={{ ...project }} params={{ pk: project.id }} onSubmit={updateProject}>
            <Form.Row columnCount={1}>
              <Elem name={"header"}>Targeted Training Backend</Elem>
              <Description>
                Choose which connected model receives training calls. Annotation-triggered training and manual training
                on this page will target only the selected backend.
              </Description>
              <ModelVersionSelector
                name="training_backend"
                valueName="training_backend"
                placeholder="Select backend for training"
              />
              <Toggle
                label="Start model training on annotation submission"
                description="Sends training requests only to the selected training backend."
                name="start_training_on_annotation_update"
              />
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
          <div style={{ marginTop: 16 }}>
            <Button disabled={!trainingBackend} onClick={onStartTraining}>
              Start Training for Selected Backend
            </Button>
          </div>
        </Block>
      </Elem>
    </Block>
  );
};

YoloTrainingSettings.title = "YOLO Training";
YoloTrainingSettings.path = "/yolo-training";
