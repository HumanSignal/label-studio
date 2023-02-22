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
    useEffect(() => {
        console.log('re-rendering');
        getLogs();
    }, []);
  
    function getLogs() {
        axios
        .get(webhook_url+'/stream?id='+ project.id)
          .then((response) => {
            console.log(response);
            setLogs(response.data.logs);
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
              <div style={{ width: 1000, overflowY: 'scroll' }}>
          <h3>Tao Trainer Logs</h3>
          <div className="row">
              <div className="col-10">
                  <p>These are all tao trainer logs, check here when you train or predict</p>
                </div>
                <div onClick={() => getLogs()} className="col-2"><button className="btn btn-danger float-right">Update Logs</button></div>
          </div>
        <div className="logs" style={{ backgroundColor: 'black', color: 'white', overflowY: 'scroll', borderRadius: 4, height: 500, padding: 5 }}>
        </div>
      </div>
      
  );
};

DisplayLogs.title = "Display Logs";
DisplayLogs.path = "/display-logs";
