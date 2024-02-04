import { useCallback, useContext, useEffect, useState } from 'react';
import { Button } from '../../../components';
import { Description } from '../../../components/Description/Description';
import { Divider } from '../../../components/Divider/Divider';
import { ErrorWrapper } from '../../../components/Error/Error';
import { InlineError } from '../../../components/Error/InlineError';
import { Form, Input, Label, TextArea, Toggle, ToggleRight, Select } from '../../../components/Form';
import { modal } from '../../../components/Modal/Modal';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { IconEmptyPredictions } from "../../../assets/icons";
import { useAPI } from '../../../providers/ApiProvider';
import { ProjectContext } from '../../../providers/ProjectProvider';
import { MachineLearningList } from './MachineLearningList';
import { MachineLearningListNew } from './MachineLearningListNew';
import { ProjectModelVersionSelector } from './ProjectModelVersionSelector';
import { CustomBackendForm } from './Forms';
import { TestRequest } from './TestRequest';
import { StartModelTraining } from './StartModelTraining';
import { ModelVersionSelector } from './ModelVersionSelector';
import { Block, cn, Elem } from '../../../utils/bem';
import { FF_DEV_1682, isFF } from '../../../utils/feature-flags';
import './MachineLearningSettings.styl';


export const MachineLearningSettings = () => {
    const api = useAPI();
    const { project, fetchProject } = useContext(ProjectContext);    
    const [backends, setBackends] = useState([]);    
        
    const fetchBackends = useCallback(async () => {
        const models = await api.callApi('mlBackends', {
            params: {
                project: project.id,
                include_static: true
            },
        });
        
        if (models) setBackends(models);
    }, [project, setBackends]);

    const startTrainingModal = useCallback((backend) => {
        const modalProps = {
            title: `Start Model Training`,
            style: { width: 760 },
            closeOnClickOutside: true,
            body: <StartModelTraining backend={backend} />
        };
        
        const modalRef = modal(modalProps);
    }, [project]);
    
    const showRequestModal = useCallback((backend) => {
        const modalProps = {
            title: `Test Request`,
            style: { width: 760 },
            closeOnClickOutside: true,
            body: <TestRequest backend={backend} />
        };
        
        const modalRef = modal(modalProps);
    }, [project]);
    
    const showMLFormModal = useCallback((backend) => {
        const action = backend ? "updateMLBackend" : "addMLBackend";    
        const modalProps = {
            title: `${backend ? 'Edit' : 'Connect'} Model`,
            style: { width: 760 },
            closeOnClickOutside: false,
            body: <CustomBackendForm action={action}
                                     backend={backend}
                                     project={project}
                                     onSubmit={() => {
                                         fetchBackends();
                                         modalRef.close();
                                     }} />                  
        };

        const modalRef = modal(modalProps);
    }, [project, fetchBackends]);

    useEffect(() => {
        if (project.id) {
            fetchBackends();
        }
    }, [project]);

    return (
        <Block name="ml-settings">
          <Elem name={'wrapper'}>
            { backends.length == 0 &&
              <EmptyState  icon={<IconEmptyPredictions />}
                           title="Let’s connect your first model"
                           description="Connect a machine learning model to generate predictions. These predictions can be compared side by side, used for efficient pre‒labeling and, to aid in active learning, directing users to the most impactful labeling tasks."
                           action={ <Button primary onClick={() => showMLFormModal()}>Connect Model</Button> }
                           footer={ <div>Need help?<br/><a>Learn more about connecting models in our docs</a></div>} /> }
                        
            <MachineLearningListNew onEdit={(backend) => showMLFormModal(backend)}
                                    onTestRequest={(backend) => showRequestModal(backend) }
                                    onStartTraining={(backend) => startTrainingModal(backend) }
                                    fetchBackends={fetchBackends}
                                    backends={backends} />
            
            <Divider height={32}/>

            { backends.length > 0 &&
              <Description style={{ marginTop: 0, maxWidth: 680 }}>
                You have {backends.length} model(s) connected. If you want to retreive predicitions from this models go to data manager, select tasks and click "Retrieve model predictions" from the Actions menu.
              </Description> }
            
            <Form action="updateProject"
                  formData={{ ...project }}
                  params={{ pk: project.id }}
                  onSubmit={() => fetchProject()}
                  autosubmit>

              { backends.length > 0 && (
                  <Form.Row columnCount={1}>
                    <Label text="Configuration" large/>
                    
                    <div style={{ paddingLeft: 16 }}>
                      <Toggle
                        label="Start model training on annotation submission"
                        description="This option will send a request to /train with information about annotations. You can Use this to enable an Active Learning loop. You can also manually start training through model menu in its card."
                        name="start_training_on_annotation_update"
                      />
                    </div>
                    
                    <div style={{ paddingLeft: 16 }}>
                      <ToggleRight
                        label="Get predictions on task load"
                        description="Predictions are retrieved each time the task is loaded in Label Stream or Quick View, and used to pre-label data. You can also configure which set of predictions could be used in Predictions tab."
                        name="evaluate_predictions_automatically"
                      />
                      <br/><br/>
                    </div>
                  </Form.Row>
              ) }

              { backends.length > 0 && (
                  <Form.Actions>
                    <Form.Indicator>
                      <span case="success">Saved!</span>
                    </Form.Indicator>
                    <Button type="submit" look="primary" style={{ width: 120 }}>Save</Button>
                  </Form.Actions>
              ) }
            </Form>      
          </Elem>
        </Block>
    );
};

MachineLearningSettings.title = "Model";
MachineLearningSettings.path = "/ml";
