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
export const ClassesLabeled = () => {
  const webhook_url = getWebhookUrl();
  const {project} = useProject();
  const api = useAPI();
  const history = useHistory();
  const [labels, setLabels] = useState([]);
    useEffect(() => {
        getNbOfLabelsPerClass();
      console.log('rerendering');
    }, [project]);
  const tableStyle = { 'border': '1px solid black', 'alignContent': 'left', 'fontSize': 20, 'textAlign': 'center', 'padding': 10 };
  function getNbOfLabelsPerClass() {
      if(project.id !== undefined)
        axios
        .get(webhook_url+'/get_nb_of_labels_per_class?id='+ project.id)
          .then((response) => {
            const labels = response.data.nb_of_labels;
            let list = Object.entries(labels);
            setLabels(list);
          })
          .catch((error) => {
              console.log(error);
          })
    }
  return (
    
    <div>
      <h3>Number of labels per class</h3>
      <table style={tableStyle}>
        <tr style={tableStyle}>
          <td style={tableStyle}>Class</td>
          <td style={tableStyle}>Number Of Labels</td>
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
      </table>
      </div>
      
  );
};

ClassesLabeled.title = "Classes Labeled";
ClassesLabeled.path = "/classes-labeled";
