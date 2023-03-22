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
export const ChangeLabelName = () => {
  const webhook_url = getWebhookUrl();
  const {project} = useProject();
  const api = useAPI();
  const history = useHistory();
  const [selectedLabel, setSelectedLabel] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const [availableLabels, setAvailableLabels] = useState([]);
  useEffect(() => {
    console.log('re-rendering');
    getLabels();
  }, []);

  function getLabels() {
    axios
      .get(webhook_url + '/get_labels?id=' + project.id)
      .then((response) => {
        if (response.data.labels !== availableLabels && (response.data.labels instanceof Array)) {
          setAvailableLabels(response.data.labels);
        }

  })
}
  const handleSelect = (event) => {
    setSelectedLabel(event.target.value);
  };

  const handleChange = (event) => {
    setNewLabel(event.target.value);
  };

   const handleSubmit = (event) => {
    event.preventDefault();
    const updatedLabels = availableLabels.map((label) => {
      if (label === selectedLabel) {
        return newLabel;
      }
      return label;
    });
    console.log('Updated labels: ', updatedLabels);
    setAvailableLabels(updatedLabels);
     axios.post(webhook_url + '/change_label_name?id=' + project.id + '&current_name=' + selectedLabel + '&new_name=' + newLabel)
    .then((response) => {
      console.log(response);
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
      <button type="submit">Submit</button>
      </form> 
      </div>  
  );
};

ChangeLabelName.title = "Change Label Name";
ChangeLabelName.path = "/change-label-name";
