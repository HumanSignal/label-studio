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

export const DisplayLogs = () => {
  const {project} = useProject();
  const api = useAPI();
  const history = useHistory();
    const [logs, setLogs] = useState([]);
    const [gotLogs, setGotLogs] = useState(false);

    useEffect(() => {
        console.log('re-rendering');
        console.log(logs);
    }, [logs]);
    function getLogs() {
        axios
        .get('http://127.0.0.1:3535/stream')
          .then((response) => {
                console.log('hee')
              setLogs(response.data.logs);
              setGotLogs(true);
            })
          .catch((error) => {
              console.log(error);
          })
    }
    // getLogs()

    console.log('hello')
  return (
              <div style={{ width: 1000, overflowY: 'scroll' }}>
          <h3>Tao Trainer Logs</h3>
          <div className="row">
              <div className="col-10">
                  <p>These are all tao trainer logs, check here when you train or predict</p>
                </div>
                <div onClick={() => getLogs()} className="col-2"><button className="btn btn-danger float-right">Update Logs</button></div>
          </div>
        <p style={{ backgroundColor: 'black', color: 'white', overflowY: 'scroll', borderRadius: 4, height: 500, padding: 5 }}>
            {logs}
        </p>
      </div>
      
  );
};

DisplayLogs.title = "Display Logs";
DisplayLogs.path = "/display-logs";
