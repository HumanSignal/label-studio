import { useCallback, useContext, useEffect, useState } from 'react';
import { Button, Card } from '../../../components';
import { Description } from '../../../components/Description/Description';
import { Divider } from '../../../components/Divider/Divider';
import { ErrorWrapper } from '../../../components/Error/Error';
import { InlineError } from '../../../components/Error/InlineError';
import { Form, Input, Label, TextArea, Toggle } from '../../../components/Form';
import { modal } from '../../../components/Modal/Modal';
import { useAPI } from '../../../providers/ApiProvider';
import { ProjectContext } from '../../../providers/ProjectProvider';
import { MachineLearningList } from './MachineLearningList';
import { ProjectModelVersionSelector } from './ProjectModelVersionSelector';
import { ModelVersionSelector } from './ModelVersionSelector';
import { FF_DEV_1682, isFF } from '../../../utils/feature-flags';
import './MachineLearningSettings.styl';
import Select from 'react-select';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios'
import Swal from 'sweetalert'
import getWebhookUrl from '../../../webhooks';
export const MachineLearningSettings = () => {
  const api = useAPI();
  const { project, fetchProject } = useContext(ProjectContext);
  const [mlError, setMLError] = useState();
  const [backends, setBackends] = useState([]);
  const [fetchedModels, setFetchModels] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [modelToPredictOn, setModelToPredictOn] = useState('');
  const [modelsPrecisions, setModelsPrecisions] = useState([]);
  const [fetchedPrecisions, setFetchPrecisions] = useState(false);
  const webhook_url = getWebhookUrl();

  const mod = useCallback(async () => {
    await axios
      .get(webhook_url + '/get_available_models?id=' + project.id)
      .then((response) => {
        console.log(response);
        setAvailableModels(response.data.models);
        setModelToPredictOn(response.data.model_path);
        console.log(availableModels);
        setFetchModels(true);
      })
      .catch((error) => {
        console.log(error);
      });
      await axios
      .get(webhook_url + '/get_mean_average_precisions?id=' + project.id)
        .then((response) => {
          console.log(response);
          setModelsPrecisions(response.data.models);
          setFetchModels(true)
          console.log(Object.keys(response.data.models))
      })
      .catch((error) => {
        console.log(error);
      });    
  });
  const saveInferencePath = useCallback(async () => {
    await axios.post(webhook_url + '/change_model_path_in_inference?id=' + project.id + '&model_path=' + modelToPredictOn)
      .then((response) => {
        console.log(response);
    })
  })
  const evaluate = useCallback(async (param) => {
    await axios.get(webhook_url + '/can_press').then((response_press) => {
      var can_press = response_press.data.can_press;
      if (can_press == undefined) {
        Swal('Someone has just trained or predicted, please wait for a moment')
      }
      else if (can_press == true) {
        Swal('Evaluation has started')
        axios.post(webhook_url + '/evaluate?id=' + project.id + '&model_path=' + param)
        .then((response) => {
          console.log(response);
          if (response.data.evaluation === false) {
            Swal("Something went wrong while evaluating, please check the logs")
          } else {
                    setModelsPrecisions(response.data.models);
          }
        })
      }
      else {
        Swal(`All Gpus are occupied, your evaluation didn't start`)
      }
    })
  });
  const fetchBackends = useCallback(async () => {
    const models = await api.callApi('mlBackends', {
      params: {
        project: project.id,
      },
    });

    if (models) setBackends(models);
  }, [api, project, setBackends]);

  async function onExportModel(){
            Swal('Exporting Model, it may take some time')
            axios.post(webhook_url + '/export?id=' + project.id)
              .then((data) => {
                console.log('export result');
                if (data.data.message) {
                  Swal(data.data.message)
                }
                const link = document.createElement('a');
                var zipFile = new Blob([atob(data.data)], {"type": "application/zip"})               
              var url = window.URL.createObjectURL(zipFile)
              link.href = "data:application/zip;base64," + data.data;
              console.log(url);
              link.download = 'myfile.zip';
              link.click();
             })
          }
  const trainModel = useCallback(async () => {
    await axios
    .get(webhook_url + '/can_press')
        .then((response) => {
          console.log(response);
          let can_press = response.data.can_press;
          if (can_press == undefined) {
            Swal('Someone has just trained or predicted, please wait for a moment')
          }
          else if (can_press == true) {
            Swal('Training has started')
            axios.post(webhook_url + '/train?id=' + project.id).then((response) => {
              console.log(response);
            })
          }
          else {
            Swal(`All Gpus are occupied, your training didn't start`)
          }
        })
  })

  const showMLFormModal = useCallback((backend) => {
    const action = backend ? "updateMLBackend" : "addMLBackend";

    const modalProps = {
      title: `${backend ? 'Edit' : 'Add'} model`,
      style: { width: 760 },
      closeOnClickOutside: false,
      body: (
        <Form
          action={action}
          formData={{ ...(backend ?? {}) }}
          params={{ pk: backend?.id }}
          onSubmit={async (response) => {
            if (!response.error_message) {
              await fetchBackends();
              modalRef.close();
            }
          }}
        >
          <Input type="hidden" name="project" value={project.id}/>

          <Form.Row columnCount={2}>
            <Input name="title" label="Title" placeholder="ML Model"/>
            <Input name="url" label="URL" required/>
          </Form.Row>

          <Form.Row columnCount={1}>
            <TextArea name="description" label="Description" style={{ minHeight: 120 }}/>
          </Form.Row>

          {isFF(FF_DEV_1682) && !!backend && (
            <Form.Row columnCount={2}>
              <ModelVersionSelector
                object={backend}
                apiName="modelVersions"
                valueName="version"
                label="Version"
              />
            </Form.Row>
          )}

          {isFF(FF_DEV_1682) && (
            <Form.Row columnCount={1}>
              <div>
                <Toggle
                  name="auto_update"
                  label="Allow version auto-update"
                />
              </div>
            </Form.Row>
          )}

          <Form.Row columnCount={1}>
            <div>
              <Toggle
                name="is_interactive"
                label="Use for interactive preannotations"
              />
            </div>
          </Form.Row>

          <Form.Actions>
            <Button type="submit" look="primary" onClick={() => setMLError(null)}>
              Validate and Save
            </Button>
          </Form.Actions>

          <Form.ResponseParser>{response => (
            <>
              {response.error_message && (
                <ErrorWrapper error={{
                  response: {
                    detail: `Failed to ${backend ? 'save' : 'add new'} ML backend.`,
                    exc_info: response.error_message,
                  },
                }}/>
              )}
            </>
          )}</Form.ResponseParser>

          <InlineError/>
        </Form>
      ),
    };

    const modalRef = modal(modalProps);
  }, [project, fetchBackends, mlError]);

  useEffect(() => {
    if (project.id) {
      mod();
      fetchBackends();
    }
  }, [project]);

  return (
    <>
      <Description style={{ marginTop: 0, maxWidth: 680 }}>
        Add one or more machine learning models to predict labels for your data.
        To import predictions without connecting a model,ss
        {" "}
        <a href="https://labelstud.io/guide/predictions.html" target="_blank">
          see the documentation
        </a>.
      </Description>
      {/* <Button onClick={() => showMLFormModal()}>
        Add Model
      </Button> */}

      <Divider height={32}/>

      <Form action="updateProject"
        formData={{ ...project }}
        params={{ pk: project.id }}
        onSubmit={() => fetchProject()}
        autosubmit
      >
        <Form.Row columnCount={1}>
          <Label text="ML-Assisted Labeling" large/>

          <div style={{ paddingLeft: 16 }}>
            <Toggle
              label="Start model training after any annotations are submitted or updated"
              name="start_training_on_annotation_update"
            />
          </div>

          <div style={{ paddingLeft: 16 }}>
            <Toggle
              label="Retrieve predictions when loading a task automatically"
              name="evaluate_predictions_automatically"
            />
          </div>

          <div style={{ paddingLeft: 16 }}>
            <Toggle
              label="Show predictions to annotators in the Label Stream and Quick View"
              name="show_collab_predictions"
            />
          </div>
        </Form.Row>
        <Button style={{ marginTop: 20 }} onClick={() => trainModel()}>Train New Model</Button>
        <Button onClick={() => onExportModel()}>
        Export Model
      </Button>
        {!isFF(FF_DEV_1682) && (
          <ProjectModelVersionSelector />
        )}
        {fetchedModels?
          <div>
          <div key={'models'}>
          <h5 style={{paddingTop:20}}>You have {availableModels.length} model{availableModels.length==1?'':'s'} in your project directory{availableModels.length > 0 ? ', they are located in: ':'.'} </h5>
          {availableModels.map(model => (
            <li key={model.value}>
            {model.label}
          </li>
        ))}
            </div>
        {modelToPredictOn.length >0 && availableModels.length>0?
          <div className="row" style={{ paddingTop: 20 }} key={'chosenModel'}>
          <h5>Choose the model you want to use when retrieving predictions:</h5>
            <div className="">
              <Select onChange={(model)=>setModelToPredictOn(model.label)} options={availableModels} placeholder={modelToPredictOn} />
            </div>
              </div> :
              <div>
          You have no specs file available, please set your classes in the labeling interface in order to create the specs for Tao Trainer
          </div>}
          </div>
          : ''}
        {modelsPrecisions != [] ?
          <div>
            <div className='row' style={{paddingTop:20}}>
            {availableModels.map(model => (
            // {model.}
              <div className='col-6' key={model.value}>
              <Card  key={model.value}>
                  Model Path: {model.label}
                  {Object.keys(modelsPrecisions).includes(model.label.split((project.title + "_id_" + project.id + "/").replaceAll(" ", "_"))[1]) ?
                    <div style={{paddingTop:15}}>
                      Mean Average Precision <strong>(mAp)</strong>: {modelsPrecisions[model.label.split((project.title + "_id_" + project.id + "/").replaceAll(" ", "_"))[1]]['mAp']}
                    <table>
                    <thead>
                    <tr><th style={{paddingRight:50}}>Class Name</th>
                      <th>Average Precision</th></tr>
                        </thead>{Object.keys(modelsPrecisions[model.label.split((project.title + "_id_" + project.id + "/").replaceAll(" ", "_"))[1]]['classes']).map((i) => (
                          <tbody key={i}>
                            <tr><td>{i}</td>
                              <td>{modelsPrecisions[model.label.split((project.title + "_id_" + project.id + "/").replaceAll(" ", "_"))[1]]['classes'][i]}</td></tr>
                          </tbody>

                        ))}
                      </table>
                      </div>
                    : 
                    <div style={{paddingTop: 15}}>
                      You don't have any information regarding this model <br></br>
                    <button onClick={() =>evaluate(model.label)} className='btn btn-outline-primary'>Evaluate</button></div>}

          </Card>
                </div>
          // {modelsPrecisions[0]["'detectnet_v2/experiment_dir_unpruned/weights/unpruned.tlt"]}
         ))}
         </div> 
          </div> : ""}
        <Form.Actions>
          <Form.Indicator>
            <span case="success">Saved!</span>
          </Form.Indicator>
          <Button onClick={saveInferencePath} type="submit" look="primary" style={{ width: 120 }}>Save</Button>
        </Form.Actions>
      </Form>

      {/* <MachineLearningList
        onEdit={(backend) => showMLFormModal(backend)}
        fetchBackends={fetchBackends}
        backends={backends}
        project = {project.id}
      /> */}

    </>
  );
};

MachineLearningSettings.title = "Machine Learning";
MachineLearningSettings.path = "/ml";
