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
import Swal from 'sweetalert2'
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
  const [modelsType, setModelsType] = useState('object_detection');
  const [keepChecks, setKeepChecks] = useState(false);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [currentlyTrainingModel, setCurrentlyTrainingModel]  = useState('');
  const handleChange = event => {
    setGenerateSpecs(event.target.checked);
  };

  const handleTrainingTypeChange = (event) => {
    setSelectedTrainingType(event.target.value);
  }


  async function mod()  {
      await axios
    .get(webhook_url + '/get_training_types?id=' + project.id)
      .then((response) => {
        const training_types = response.data.training_types;
        setTrainingTypes(training_types);
        setSelectedTrainingType(training_types[0]);
        if (training_types.indexOf("Tao Training") !== -1) { 
          setKeepChecks(true);
        }
    })

      await axios
      .get(webhook_url + '/get_models_info?id=' + project.id)
        .then((response) => {
          setModelsPrecisions(response.data.models_info);
          setModelsType(response.data.models_type);
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
    await axios
    .get(webhook_url + '/get_available_projects')
      .then((response) => {
        setAvailableProjects(response.data);
      })
      
      await axios
      .get(webhook_url + '/get_currently_training_model?id=' + project.id)
        .then((response) => {
          console.log(response);
          if(response && response.data && response.data.model_version){
            const trainingModel = response.data.model_version;
            setCurrentlyTrainingModel(trainingModel);
  
          }
      }).error(() => {
        console.log("error");
      })
  };
  const saveInferencePath = useCallback(async (modelChosen = null, projectId= null) => {
    if (modelChosen == null) modelChosen = modelToPredictOn;
    await axios.post(webhook_url + '/change_current_model_version?id=' + project.id + '&model_version=' + modelChosen+"&model_project_id=" + projectId)
      .then((response) => {
        console.log(response);
    })
  })
  const fetchBackends = useCallback(async () => {
    const models = await api.callApi('mlBackends', {
      params: {
        project: project.id,
      },
    });

    if (models) setBackends(models);
  }, [project, setBackends]);

  async function onPrune(model_version) {
    Swal.fire('Pruning model, this may take some time')
    axios.post(webhook_url + '/prune?id=' + project.id + "&model_version="+model_version)
    .then((response) => {
      if (response.data.unprune === false){
        Swal.fire("The unpruned model wasn't found in the project. Please train a model or add one first!")
      }
      else if (response.data.prune == false) {
        Swal.fire("An error occured when running the prune_and_retrain_fixed function, please check the logs")
      }
      else{
        Swal.fire("The model was pruned, you can find it here: "+ response.data.pruned_path)
      }
    })
  }
  async function onViewInfo(model_version) {
    console.log("viewing info on tensorboard");
    axios.post(webhook_url + '/view_model_info_tensorboard?id=' + project.id + '&model_version=' + model_version)
    .then((response) => {
      const data = response.data
    if (data.success == true)
      Swal.fire('Success', `Tensorboard is ready, view your model information in: ${data.ip}`, 'success');
  });
} 
  async function onDeleteModel(model_version) {

    console.log('delete model')
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: 'btn btn-success m-2',
        cancelButton: 'btn btn-info',

      },
      buttonsStyling: false
    })
    
    swalWithBootstrapButtons.fire({
      title: 'Are you sure? ',
      text: "Once deleted, you will not be able to recover this model!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'No',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        axios.post(webhook_url + '/deleteModel?id=' + project.id + '&model_version=' + model_version)
          .then((data) => {
          if (data.delete == true)
            Swal.fire('Success', 'Model is successfully deleted', 'success');
        });
      } else {
        Swal.fire('Safe', "Your model is safe!", "info");
      }
    });
  }
  async function onExportModel(model_version) {
    Swal.fire('Export', 'Exporting Model, it may take some time', 'info');
    axios.post(webhook_url + '/export?id=' + project.id +'&model_version=' + model_version)
    .then((response) => {
        if (response.data.message) {
          Swal.fire("Error", response.data.message, 'error');
        } else {
          console.log(response.data);
          const decodedData = atob(response.data.model);
          const arrayBuffer = new ArrayBuffer(decodedData.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          for (let i = 0; i < decodedData.length; i++) {
            uint8Array[i] = decodedData.charCodeAt(i);
          }
          const blob = new Blob([arrayBuffer], { type: 'application/zip' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = model_version + '.zip';
          link.click();
        }
      })
      .catch((error) => {
        console.error('Export error');
        console.error(error);
        Swal.fire('Error', 'Failed to export the model', 'error');
      });
  }

  const onAbortTraining = useCallback(async (model) => {
    await axios
    .post(webhook_url + "/abort_training?id=" + project.id+"&model_version=" + model)
    .then((response) => {
      console.log(response);
      if(response.data.message){
        Swal.fire("Success", response.data.message, 'success');
      }
      else{
        Swal.fire("Error", response.data.error, "error");
      }
    })
  })
  const trainModel = useCallback(async () => {
    await axios
    .get(webhook_url + '/can_press')
        .then((response) => {
          let can_press = response.data.can_press;
          console.log(selectedTrainingType);

          if (can_press == undefined) {
            Swal.fire('Error', 'Someone has just trained or predicted, please wait for a moment', 'error')
          }
          else if (can_press == true) {
            Swal.fire('Start', 'Training has started', 'info');
            let trainingType = "tao";
            if (selectedTrainingType === "PVT") {
              trainingType = "pvt";
            }
            if(selectedTrainingType === "Segmentation Tool"){
              trainingType = "segmentation_tool";
            }
            if(selectedTrainingType === "Segmentation Tao"){
              trainingType = "segmentation_tao";
            }
            axios.post(webhook_url + '/train?id=' + project.id+'&generateSpecs='+generateSpecs+'&type='+trainingType).then((response) => {
              console.log(response);
            })
          }
          else {
            Swal.fire('Error', `All Gpus are occupied, your training didn't start`, 'error')
          }
        })
  })

  const generatePredictionZipFile = async () => {
    Swal.fire({
      title: 'Prediction Tool',
      text: 'Please specify if you want to extract predictions for all images or only the annotated ones',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'All Tasks',
      denyButtonText: `Annotated Taks`,
    }).then( async (result) => {
      /* Read more about isConfirmed, isDenied below */
      let allTasks= true;
      if (result.isDenied) {
        allTasks= false;
      }
      if (result.isConfirmed || result.isDenied){
        console.log("Generating prediction zip file");
        Swal.fire("Please wait", "We are currently generating the zip file, it will be downloaded shortly", "info");
        document.getElementById("generateButton").disabled = true;
        document.getElementById("generateButton").style.backgroundColor = 'gray';
    
        await axios.post(webhook_url + "/prediction_tool?project_id="+project.id+"&all_tasks=" + allTasks).then((response) => {
          if (response.data.message) {
            Swal.fire("Error",response.data.message, "error");
          } else {
            const decodedData = atob(response.data.zip_file);
            const arrayBuffer = new ArrayBuffer(decodedData.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < decodedData.length; i++) {
              uint8Array[i] = decodedData.charCodeAt(i);
            }
            const blob = new Blob([arrayBuffer], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = "predictionToolProject_"+project.id + '.zip';
            link.click();
          }
    
        }).catch((error) => {
          Swal.fire("Error", "An error occured while trying to run the prediction, make sure that the processes are running (tao pyro, pvt, segmentation)", "error");
        }).finally(()=> {
          document.getElementById("generateButton").disabled = false;
          document.getElementById("generateButton").style.backgroundColor = 'green';
        })
      }

    })

  }


  const changeModelToPredictOn = async () => {
    console.log("changing model");
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: 'btn btn-success m-2',
        cancelButton: 'btn btn-info',

      },
      buttonsStyling: false
    })
    
    swalWithBootstrapButtons.fire({
      title: 'Model Directory',
      text: "Please choose the directory of your model",
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Local Project',
      cancelButtonText: 'Other Projects',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { value: version } = await Swal.fire({
          title: 'Select model version',
          input: 'select',
          inputOptions: availableModels.map(function(availableModels) {return availableModels.label}),
          inputPlaceholder: 'Select a version',
          showCancelButton: true,
          inputValidator: (modelChosenIndex) => {
            return new Promise((resolve) => {
              resolve();
              const modelChosen = availableModels.map(function (availableModels) { return availableModels.label })[modelChosenIndex];
              setModelToPredictOn(modelChosen);
              saveInferencePath(modelChosen, project.id);
            })
          }
        })
      } else if (
        result.dismiss === Swal.DismissReason.cancel
      ) {
        const available_projects = availableProjects;
      
        if(modelsType == "object_detection"){
          delete available_projects["Segmentation"]
        }
        else{
          delete available_projects["Object Detection"]
        }
        const { value: project } = Swal.fire({
          title: 'Select a project to choose a model from',
          input: 'select',
          inputOptions: available_projects,
          inputPlaceholder: 'Select a project',
          showCancelButton: true,
          inputValidator: (projectId) => {
            return new Promise(async (resolve) => {
              await axios.get(webhook_url+ '/get_available_model_versions?id=' + projectId)
              .then((response) => {
                const availableModelsFromOtherProject = response.data.model_versions;
                const { value: version } = Swal.fire({
                  title: 'Select model version',
                  input: 'select',
                  inputOptions: availableModelsFromOtherProject.map(function(availableModelsFromOtherProject) {return availableModelsFromOtherProject.label}),
                  inputPlaceholder: 'Select a version',
                  showCancelButton: true,
                  inputValidator: (modelChosenIndex) => {
                    return new Promise((resolve) => {
                      resolve();
                      const modelChosen = availableModelsFromOtherProject.map(function (availableModelsFromOtherProject) { return availableModelsFromOtherProject.label })[modelChosenIndex];
                      saveInferencePath(modelChosen, projectId);
                      setModelToPredictOn(modelChosen);
                    })
                  }
                })
            })
              resolve();
            })
          }
        })   
    if (project) {
      Swal.fire(`Cloning Project ${project}`)
    }

      }
    })
  };

  useEffect(() => {
    if (project.id) {
      mod();
      fetchBackends();
    }
  }, [project.id]);

  return (
    <>
      <Description style={{ marginTop: 0, maxWidth: 680 }}>
        Add one or more machine learning models to predict labels for your data.
        To import predictions without connecting a model,
        {" "}
        <a href="https://labelstud.io/guide/predictions.html" target="_blank">
          see the documentation
        </a>.
      </Description>
      {/* <Button onClick={() => showMLFormModal()}>
        Add Model
      </Button> */}

      <Divider height={32}/>

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
        <div style={{ marginTop: 20 }}>
          {keepChecks ?
            <label>
              <input
                type="checkbox"
                checked={generateSpecs}
                onChange={handleChange}
                style={{ marginRight: 5 }}
            />
              Generate new specs for training
            </label>
            :
            ''}</div>
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
        <div className="row" style={{ paddingTop: 20 }} key={'chosenModel'}>
          <label htmlFor="prediction-model">Model used to predict on: <strong>{modelToPredictOn}</strong>
            <Button onClick={() => changeModelToPredictOn()} look="primary" style={{ width: '10%', marginLeft: 10 }}>Change Model</Button>
          </label>
 
              </div>
              <button id="generateButton" onClick={() => generatePredictionZipFile()} style={{ width: '20%', marginTop: 20, color: 'white', borderRadius: 5, backgroundColor: 'green' }}>Generate Prediction Zip File</button>
              <label>By clicking on this button, you will get a zip file containing predictions for the already annotated images in this project. The predictions will be divided into correct and incorrect folders (correct images are the ones where the number of objects detected is equal to the number of objects annotated)</label>
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
          </div>
          : ''}
        {modelsPrecisions != [] ?
          <div>
            <div className='row' style={{paddingTop:20}}>
            {availableModels.map(model => (
              <div className='col-6' key={model.value} style={{marginBottom: 10}}>
              <Card  key={model.value}>
                  Model Version: {model.label}     
                  {modelsType != 'segmentation' ?
                    <div>
                    {
                      Object.keys(modelsPrecisions).includes(model.label) ?
                        <div style={{ paddingTop: 15 }}>
                          <h4>Project Type: {modelsPrecisions[model.label]['model_type']}</h4>
                          <h5>Mean Average Precision <strong>(mAp)</strong>: {modelsPrecisions[model.label]['mAp']}</h5>
                          {modelsPrecisions[model.label]['model_type'] == "tao"?
                          
                          <table>
                            <thead>
                              <tr><th style={{ paddingRight: 50 }}>Class Name</th>
                                <th>Average Precision</th></tr>
                            </thead>{Object.keys(modelsPrecisions[model.label]['classes']).map((i) => (
                              <tbody key={i}>
                                <tr><td>{i}</td>
                                  <td>{modelsPrecisions[model.label]['classes'][i]}</td></tr>
                              </tbody>

                            ))}
                          </table>
                          :''}
                          {modelsPrecisions[model.label]['score'] && Object.keys(modelsPrecisions[model.label]['score']).length > 0 ?
                            <div>
                              <h5 style={{ marginTop: 20 }}>Beta Score</h5>
                              <table>
                                <thead>
                                  <tr><th style={{ paddingRight: 50 }}>Class Name</th>
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
                        </div>
                        :
                        <div style={{ paddingTop: 15 }}>
                          You don't have any information regarding this model <br></br>
                          </div>
                    }
                    </div>
                    :
                    <div>
                      {Object.keys(modelsPrecisions).includes(model.label) ? 
                        <div>
                          <table>
                            <thead>
                              <tr><th style={{ paddingRight: 50 }}>Model Information</th>
                                <th>Values</th></tr>
                            </thead>{Object.keys(modelsPrecisions[model.label]).map((i) => (
                              <tbody key={i}>
                                <tr><td>{i}</td>
                                  <td>{modelsPrecisions[model.label][i]}</td></tr>
                              </tbody>
                            ))}
                          </table>
                      </div>:<div>You have no information about this model</div>}</div>}
                      <div style={{ marginTop: 20 }}>
                            <button style={{ marginRight: 10 }} onClick={() => onExportModel(model.value)} className='btn btn-outline-primary'>Export Model</button>
                    {currentlyTrainingModel == model.label ? <button onClick={() => onAbortTraining(model.value)} className='btn btn-outline-warning'>Abort Training</button> : ""}
                    <button style={{ marginLeft: 10 }} onClick={() => onViewInfo(model.value)} className='btn btn-outline-warning'>View Tensorboard</button>

                            <button style={{ marginLeft: 10 }} onClick={() => onDeleteModel(model.value)} className='btn btn-outline-danger'>Delete Model</button>
            </div>
          </Card>
        </div>
         ))}
         </div> 
          </div> 
          : ""}

          <Button onClick={saveInferencePath} type="submit" look="primary" style={{ width: 120 }}>Save</Button>

    </>
  );
};

MachineLearningSettings.title = "Machine Learning";
MachineLearningSettings.path = "/ml";
