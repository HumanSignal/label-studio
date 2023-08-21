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
import Swal from "sweetalert2";
export const ClassesLabeled = () => {
  const webhook_url = getWebhookUrl();
  const {project} = useProject();
  const api = useAPI();
  const history = useHistory();
  const [labels, setLabels] = useState([]);
  const [date, setDate] = useState('Unknown');
  useEffect(() => {
    if (project.id) {
      console.log('re-rendering in number of labels per class');
      getNbOfLabelsPerClass(false);
    }
  }, [project, date]);
  const tableStyle = { 'border': '1px solid black', 'alignContent': 'left', 'fontSize': 20, 'textAlign': 'center', 'padding': 10 };
  function getNbOfLabelsPerClass(compute= false) {
    document.getElementById("compute").disabled = true;
      if(project.id !== undefined)
        axios
        .get(webhook_url+'/get_nb_of_labels_per_class?id='+ project.id+"&compute="+compute)
          .then((response) => {
            const labels = response.data.nb_of_labels;
            const date = response.data.date;

            setDate(date);
            console.log(labels);
            console.log(date);
            let list = Object.entries(labels);
            setLabels(list);
            if (list.length == 0) {
              Swal.fire('Warning', 'It seems that the number of labels per class is not computed. Currently counting ... (if there is any)', 'warning')
            }
          })
          .catch((error) => {
              console.log(error);
          })
          .finally(() => {
            document.getElementById("compute").disabled = false;
          })
    }
  return (
    
    <div>
      <h3>Number of labels per class</h3>
      <table style={tableStyle}>
      <tbody>
        <tr style={tableStyle}>
          <th style={tableStyle}>Class</th>
          <th style={tableStyle}>Number Of Labels</th>
        </tr>
        {labels.map((label) => (
          <tr style={tableStyle} key = {label}>
            <td style={tableStyle}>
              {label[0]}
            </td>
            <td style={tableStyle}>
              {label[1]}
            </td>
        </tr>
      ))}
      </tbody>
      </table>
      {labels.length  == 0 ?<p style={{color: 'red'}}>Please wait until we compute the number of labels per class in the project</p>:<div></div>}
      <p  style={{marginTop: 35}}>Date Computed: {date}</p>
      <button id="compute" onClick={() => getNbOfLabelsPerClass(true)} style={{ backgroundColor: 'green', color: 'white', borderRadius: 5}}>Compute again</button>
      </div>
      
  );
};

ClassesLabeled.title = "Classes Labeled";
ClassesLabeled.path = "/classes-labeled";
