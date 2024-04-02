import { useCallback, useContext, useEffect, useState } from 'react';
import { Button, Spinner } from '../../../components';
import { Description } from '../../../components/Description/Description';
import { Divider } from '../../../components/Divider/Divider';
import { Form, Label, Toggle } from '../../../components/Form';
import { modal } from '../../../components/Modal/Modal';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { IconEmptyPredictions } from '../../../assets/icons';
import { useAPI } from '../../../providers/ApiProvider';
import { ProjectContext } from '../../../providers/ProjectProvider';
import { MachineLearningList } from './MachineLearningList';
import { CustomBackendForm } from './Forms';
import { TestRequest } from './TestRequest';
import { StartModelTraining } from './StartModelTraining';
import { Block, Elem } from '../../../utils/bem';
import './MachineLearningSettings.styl';

export const MachineLearningSettings = () => {
  const api = useAPI();
  const { project, fetchProject } = useContext(ProjectContext);
  const [backends, setBackends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchBackends = useCallback(async () => {
    setLoading(true);
    const models = await api.callApi('mlBackends', {
      params: {
        project: project.id,
        include_static: true,
      },
    });

    if (models) setBackends(models);
    setLoading(false);
    setLoaded(true);
  }, [project, setBackends]);

  const startTrainingModal = useCallback(
    (backend) => {
      const modalProps = {
        title: `Start Model Training`,
        style: { width: 760 },
        closeOnClickOutside: true,
        body: <StartModelTraining backend={backend} />,
      };

      modal(modalProps);
    },
    [project],
  );

  const showRequestModal = useCallback(
    (backend) => {
      const modalProps = {
        title: `Test Request`,
        style: { width: 760 },
        closeOnClickOutside: true,
        body: <TestRequest backend={backend} />,
      };

      modal(modalProps);
    },
    [project],
  );

  const showMLFormModal = useCallback(
    (backend) => {
      const action = backend ? 'updateMLBackend' : 'addMLBackend';
      const modalProps = {
        title: `${backend ? 'Edit' : 'Connect'} Model`,
        style: { width: 760 },
        closeOnClickOutside: false,
        body: (
          <CustomBackendForm
            action={action}
            backend={backend}
            project={project}
            onSubmit={() => {
              fetchBackends();
              modalRef.close();
            }}
          />
        ),
      };

      const modalRef = modal(modalProps);
    },
    [project, fetchBackends],
  );

  useEffect(() => {
    if (project.id) {
      fetchBackends();
    }
  }, [project.id]);

  return (
    <Block name="ml-settings">
      <Elem name={'wrapper'}>
        {loading && <Spinner size={32} />}
        {loaded && backends.length === 0 && (
          <EmptyState
            icon={<IconEmptyPredictions />}
            title="Let’s connect your first model"
            description="Connect a machine learning model to generate predictions. These predictions can be compared side by side, used for efficient pre‒labeling and, to aid in active learning, directing users to the most impactful labeling tasks."
            action={(
              <Button primary onClick={() => showMLFormModal()}>
                Connect Model
              </Button>
            )}
            footer={(
              <div>
                Need help?
                <br />
                <a>Learn more about connecting models in our docs</a>
              </div>
            )}
          />
        )}
        <MachineLearningList
          onEdit={(backend) => showMLFormModal(backend)}
          onTestRequest={(backend) => showRequestModal(backend)}
          onStartTraining={(backend) => startTrainingModal(backend)}
          fetchBackends={fetchBackends}
          backends={backends}
        />

        <Divider height={32} />

        {backends.length > 0 && (
          <Description style={{ marginTop: 0, maxWidth: 680 }}>
            A connected model has been detected! If you wish to fetch
            predictions from this model, please follow these steps:
            <br />
            <br />
            1. Navigate to the <i>Data Manager</i>.<br />
            2. Select the desired tasks.
            <br />
            3. Click on <i>Retrieve model predictions</i> from the{' '}
            <i>Actions</i> menu.
            <br />
            <br />
            Additionally, you can configure the system to use this model for
            fetching live predictions in the <i>Annotation</i> tab.
          </Description>
        )}

        <Form
          action="updateProject"
          formData={{ ...project }}
          params={{ pk: project.id }}
          onSubmit={() => fetchProject()}
        >
          {backends.length > 0 && (
            <Form.Row columnCount={1}>
              <Label text="Configuration" large />

              <div style={{ paddingLeft: 16 }}>
                <Toggle
                  label="Start model training on annotation submission"
                  description="This option will send a request to /train with information about annotations. You can use this to enable an Active Learning loop. You can also manually start training through model menu in its card."
                  name="start_training_on_annotation_update"
                />
              </div>
            </Form.Row>
          )}

          {backends.length > 0 && (
            <Form.Actions>
              <Form.Indicator>
                <span case="success">Saved!</span>
              </Form.Indicator>
              <Button type="submit" look="primary" style={{ width: 120 }}>
                Save
              </Button>
            </Form.Actions>
          )}
        </Form>
      </Elem>
    </Block>
  );
};

MachineLearningSettings.title = 'Model';
MachineLearningSettings.path = '/ml';
