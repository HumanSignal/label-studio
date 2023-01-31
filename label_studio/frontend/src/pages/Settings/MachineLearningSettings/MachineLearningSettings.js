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
  const webhook_url = getWebhookUrl();
  const [generateSpecs, setGenerateSpecs] = useState(true);
  const [selectedTrainingType, setSelectedTrainingType] = useState('');
  const [trainingTypes, setTrainingTypes] = useState([]);

  const handleChange = event => {
    setGenerateSpecs(!event.target.checked);
  };

  const handleTrainingTypeChange = (event) => {
    setSelectedTrainingType(event.target.value);
  }


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
    .get(webhook_url + '/get_training_types?id=' + project.id)
      .then((response) => {
        const training_types = response.data.training_types;
        setTrainingTypes(training_types);
        setSelectedTrainingType(training_types[0]);
    })
      await axios
      .get(webhook_url + '/get_mean_average_precisions?id=' + project.id)
        .then((response) => {
          console.log(response);
          setModelsPrecisions(response.data.models);
          setFetchModels(true)
      })
      .catch((error) => {
        console.log(error);
      });
    await axios.get(webhook_url+ '/get_available_model_versions?id=' + project.id)
      .then((response) => {
        setModelToPredictOn(response.data.current_model_version)
        setAvailableModels(response.data.model_versions)
    })
  });
  const saveInferencePath = useCallback(async () => {
    await axios.post(webhook_url + '/change_current_model_version?id=' + project.id + '&model_version=' + modelToPredictOn)
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
  }, [project, setBackends]);

  async function onPrune(model_version) {
    Swal('Pruning model, this may take some time')
    axios.post(webhook_url + '/prune?id=' + project.id + "&model_version="+model_version)
    .then((response) => {
      if (response.data.unprune === false){
        Swal("The unpruned model wasn't found in the project. Please train a model or add one first")
      }
      else if (response.data.prune == false) {
        Swal("An error occured when running the prune_and_retrain_fixed function, please check the logs")
      }
      else{
        Swal("The model was pruned, you can find it here: "+ response.data.pruned_path)
      }
    })
  }
  async function onDeleteModel(model_version) {
    console.log('delete model')
    Swal({
      title: "Are you sure?",
      text: "Once deleted, you will not be able to recover this imaginary file!",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    })
    .then((willDelete) => {
      if (willDelete) {
        axios.post(webhook_url + '/deleteModel?id=' + project.id + '&model_version=' + model_version)
          .then((data) => {
          if (data.delete == true)
            Swal('Model is successfully deleted');
        });
        Swal("Your model has been deleted!", {
          icon: "success",
        });
      } else {
        Swal("Your model is safe!");
      }
    });

  }
  async function onExportModel(model_version) {
            Swal('Exporting Model, it may take some time')
            axios.post(webhook_url + '/export?id=' + project.id +'&model_version=' + model_version)
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
              link.download = model_version+'.zip';
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
            Swal('Training has started');
            axios.post(webhook_url + '/train?id=' + project.id+'&generateSpecs='+generateSpecs+'&type='+selectedTrainingType).then((response) => {
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
        <div style={{marginTop: 20}}>
          <label>
      <input
        type="checkbox"
        checked={generateSpecs}
        onChange={handleChange}
        style={{marginRight: 5}}
      />
      Generate new specs for training
    </label></div>
        <div style={{marginTop: 10}}>
      <label htmlFor="training-type-select">Select Training Type:</label>
            <select
              style={{marginLeft: 5}}
        id="training-type-select"
        value={selectedTrainingType}
        onChange={handleTrainingTypeChange}
      >
        {trainingTypes.map(type => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
          </select>
        </div>
        <div>
      <Button style={{ marginTop: 10 }} onClick={() => trainModel()}>Train New Model</Button>

    </div>
        {/* <Button style={{marginLeft: 20}} onClick={() => onExportModel()}>
        Export Model
      </Button>
      <Button style={{marginLeft: 20}} onClick={() => onPrune()}>
      Prune/Re-train
      </Button> */}
        {/* {!isFF(FF_DEV_1682) && (
          <ProjectModelVersionSelector />
        )} */}
          <div className="row" style={{ paddingTop: 20 }} key={'chosenModel'}>
          <h5>Choose the model version you want to use when retrieving predictions:</h5>
            <div className="">
              <Select onChange={(model)=>setModelToPredictOn(model.value)} options={availableModels} placeholder={modelToPredictOn} />
            </div>
              </div>
        {fetchedModels?
          <div>
          <div key={'models'}>
          <h5 style={{paddingTop:20}}>You have {availableModels.length} model{availableModels.length==1?'':'s'} in your project directory{availableModels.length > 0 ? ', they are: ':'.'} </h5>
          {availableModels.map(model => (
            <li key={model.value}>
            {model.value}
          </li>
        ))}
            </div>
        {/* {modelToPredictOn.length >0 && availableModels.length>0?
          <div className="row" style={{ paddingTop: 20 }} key={'chosenModel'}>
          <h5>Choose the model you want to use when retrieving predictions:</h5>
            <div className="">
              <Select onChange={(model)=>setModelToPredictOn(model.label)} options={availableModels} placeholder={modelToPredictOn} />
            </div>
              </div> :
              <div>
          You have no specs file available, please set your classes in the labeling interface in order to create the specs for Tao Trainer
          </div>} */}
          </div>
          : ''}
        {modelsPrecisions != [] ?
          <div>
            <div className='row' style={{paddingTop:20}}>
            {availableModels.map(model => (
            // {model.}
              <div className='col-6' key={model.value} style={{marginBottom: 10}}>
              <Card  key={model.value}>
                  Model Version: {model.label}
                  {Object.keys(modelsPrecisions).includes(model.label) ?
                    <div style={{paddingTop:15}}>
                      <h5>Mean Average Precision <strong>(mAp)</strong>: {modelsPrecisions[model.label]['mAp']}</h5>
                    <table>
                    <thead>
                    <tr><th style={{paddingRight:50}}>Class Name</th>
                      <th>Average Precision</th></tr>
                        </thead>{Object.keys(modelsPrecisions[model.label]['classes']).map((i) => (
                          <tbody key={i}>
                            <tr><td>{i}</td>
                              <td>{modelsPrecisions[model.label]['classes'][i]}</td></tr>
                          </tbody>

                        ))}
                      </table>
                      {modelsPrecisions[model.label]['score'] && Object.keys(modelsPrecisions[model.label]['score']).length > 0 ?
                        <div>
                      <h5 style={{marginTop: 20}}>Beta Score</h5>
                      <table>
                    <thead>
                    <tr><th style={{paddingRight:50}}>Class Name</th>
                      <th>Score</th></tr>
                            </thead>
                            {Object.keys(modelsPrecisions[model.label]['score']).map((i) => (
                          <tbody key={i}>
                            <tr><td>{i}</td>
                              <td>{modelsPrecisions[model.label]['classes'][i]}</td></tr>
                          </tbody>

                        ))}
                          </table>
                          </div>
                        : ''}
                      <div style={{marginTop: 20}}>
                      <button style={{marginRight: 10}} onClick={() =>onExportModel(model.value)} className='btn btn-outline-primary'>Export Model</button>
                      <button onClick={() =>onPrune(model.value)} className='btn btn-outline-warning'>Prune/Re-train</button>
                      <button style={{marginLeft: 10}} onClick={() =>onDeleteModel(model.value)} className='btn btn-outline-danger'>Delete Model</button>

                      </div>
                      </div>
                    : 
                    <div style={{paddingTop: 15}}>
                      You don't have any information regarding this model <br></br>
                    <button onClick={() =>evaluate(model.label)} className='btn btn-outline-primary'>Evaluate</button></div>}

          </Card>
                </div>
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
