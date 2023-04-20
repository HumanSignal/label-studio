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
export const DisplayLogs = () => {
  const webhook_url = getWebhookUrl();
  const {project} = useProject();
  const api = useAPI();
  const history = useHistory();
    const [logs, setLogs] = useState([]);
  const [gotLogs, setGotLogs] = useState(false);
  const [selectedModelVersion, setSelectedModelVersion] = useState('');
  const [modelVersions, setModelVersions] = useState([]);
  const [type, setType] = useState("tao");
  useEffect(() => {
    if (project.id) {
      console.log('re-rendering');
      getLogs();
      getModelVersions();
      }
    }, [project.id]);
  async function getModelVersions() {
    await axios.get(webhook_url + '/get_available_model_versions?id=' + project.id)
      .then((response) => {
        setSelectedModelVersion(response.data.current_model_version);
        setModelVersions(response.data.model_versions);
      });
      
  }
  const handleSelect = (event) => {
    setSelectedModelVersion(event.target.value);
    getLogs(event.target.value);
  };
  function getLogs(model_version = null) {
        let url = webhook_url + "/stream?id=" + project.id + (model_version == null? "":"&model_version=" + model_version)
        axios
        .get(url)
          .then((response) => {
            setLogs(response.data.logs);
            setType(response.data.type);
            var x = document.querySelector(".logs");
            x.innerHTML = ''
              for (var i = 0; i < response.data.logs.length; i++) {
                var line = response.data.logs[i];
                const p = document.createElement('p');
                p.innerHTML = line
                p.setAttribute(
                  'style', 
                  'color: white'
                )
                x.appendChild(p);
                console.log(line)
              }
          
            setGotLogs(true);
          })
          .catch((error) => {
              console.log(error);
          })
    }
  return (
      <div style={{ width: 1000 }}>
      {type == "tao" ? <h3>Tao Trainer Logs</h3> : <div><h3>Segmentation Logs</h3>
              <label>
              Select a label:
              <select value={selectedModelVersion} onChange={handleSelect} style={{marginLeft: 10}}>
                <option value="" disabled>
                  Select a label
                </option>
                {Object.keys(modelVersions).map((key) => (
                  <option key={modelVersions[key]['label']} value={modelVersions[key]['label']}>
                    {modelVersions[key]['label']}
                  </option>
                ))}
              </select>
        </label>
        </div>
      }
        <div>

      </div>
          <div className="row">
              <div className="col-10">
                  <p>These are the logs, check here when you train or predict</p>
                </div>
                <div onClick={() => getLogs()} style={{marginBottom: 10}} className="col-2"><button className="btn btn-success float-right">Update Logs</button></div>
          </div>
        <div className="logs" style={{ backgroundColor: 'black', color: 'white', overflowY: 'scroll', borderRadius: 4, height: 500, padding: 5 }}>
        </div>
      </div>
      
  );
};

DisplayLogs.title = "Display Logs";
DisplayLogs.path = "/display-logs";
