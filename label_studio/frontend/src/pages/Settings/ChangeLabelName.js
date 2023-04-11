import { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router";
import { Button } from "../../components";
import { Label } from "../../components/Form";
import { confirm } from "../../components/Modal/Modal";
import { Space } from "../../components/Space/Space";
import { Spinner } from "../../components/Spinner/Spinner";
import { useAPI } from "../../providers/ApiProvider";
import { useProject } from "../../providers/ProjectProvider";
import axios from 'axios'
import getWebhookUrl from "../../webhooks";
import Swal from 'sweetalert2'

export const ChangeLabelName = () => {
  const webhook_url = getWebhookUrl();
  const {project} = useProject();
  const api = useAPI();
  const history = useHistory();
  const [selectedLabel, setSelectedLabel] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [nbOfAnnotations, setNbOfAnnotations] = useState(0);
  const [nbOfTasksChanged, setNbOfTasksChanged] = useState(0);
  const [availableLabels, setAvailableLabels] = useState([]);
  const [functionRunning, setFunctionRunning] = useState(false);
  useEffect(() => {
    console.log('re-rendering');
    if (project.id) {
      getLabels();
    }
  }, [project.id]);

  async function getLabels() {
    await axios
      .get(webhook_url + '/get_labels?id=' + project.id)
      .then((response) => {
        console.log(response.data);
        if (response.data.labels !== availableLabels && (response.data.labels instanceof Array)) {
          setAvailableLabels(response.data.labels);
        }
        if (response.data.changing) {
          setFunctionRunning(true);
        }
        if (response.data.annotations) {
          setNbOfAnnotations(response.data.annotations);
        }
        if (response.data.nb_of_tasks_changed) {
          setNbOfTasksChanged(response.data.nb_of_tasks_changed);
        }

  })
}
  const handleSelect = (event) => {
    setSelectedLabel(event.target.value);
  };

  const handleChange = (event) => {
    setNewLabel(event.target.value);
  };

   const handleSubmit = async (event) => {
     event.preventDefault();
     setFunctionRunning(true);

    const updatedLabels = availableLabels.map((label) => {
      if (label === selectedLabel) {
        return newLabel;
      }
      return label;
    });
     console.log('Updated labels: ', updatedLabels);
     Swal.fire({
      title: 'Running',
      text: "Your label is being named, this may take some time!",
      icon: 'info',
     })
     
     const requestBody = {
      id: project.id,
      current_name: selectedLabel,
      new_name: newLabel
    };
    await axios.post(webhook_url + '/change_label_name', requestBody)
    .then((response) => {
      console.log(response);
      if (response.data.changingLabel) {
        Swal.fire({
          title: 'Success',
          text: "Your label has been renamed!",
          icon: 'success',
        });
        setAvailableLabels(updatedLabels);
        setFunctionRunning(false);
      }
      else {
        Swal.fire({
          title: 'Error',
          text: response.data.error,
          icon: 'error',
        }) 
      }
  })
  };

  return (
    <div><h3>Change Label Name</h3>
    <form onSubmit={handleSubmit} style={{marginTop: 30}}>
      <label>
        Select a label:
        <select value={selectedLabel} onChange={handleSelect} style={{marginLeft: 10}}>
          <option value="" disabled>
            Select a label
          </option>
          {availableLabels?.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <br />
      <br />
      <label>
        Change label to:
        <input style={{marginLeft: 10}} type="text" value={newLabel} onChange={handleChange} />
      </label>
      <br />
      <br />
        <button disabled={functionRunning} type="submit">Submit</button>
        {functionRunning ? 
          <div>
            <p>Please wait until all labels are changed. Tasks renamed: {nbOfTasksChanged}/{nbOfAnnotations} (Task renaming is done 20 at a time)</p>
            <p style={{color: 'red'}}>If the function is stuck on a certain number for a long period (more than 1 minute) of time or you face any difficulty please contact the developers.</p>
          </div> :
          <div>
          </div>}
      </form> 
      </div>  
  );
};

ChangeLabelName.title = "Change Label Name";
ChangeLabelName.path = "/change-label-name";
