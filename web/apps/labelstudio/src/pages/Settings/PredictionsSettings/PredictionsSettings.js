import { useCallback, useContext, useEffect, useState } from 'react';
import { Button } from '../../../components';
import { Description } from '../../../components/Description/Description';
import { Divider } from '../../../components/Divider/Divider';
import { ErrorWrapper } from '../../../components/Error/Error';
import { InlineError } from '../../../components/Error/InlineError';
import { Form, Input, Label, TextArea, Toggle, Select } from '../../../components/Form';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { Caption } from '../../../components/Caption/Caption'; 
import { IconInfo, IconEmptyPredictions } from "../../../assets/icons";
import { modal } from '../../../components/Modal/Modal';
import { useAPI } from '../../../providers/ApiProvider';
import { ProjectContext } from '../../../providers/ProjectProvider';
import { PredictionsList } from './PredictionsList';
import { Block, Elem } from '../../../utils/bem';
import './PredictionsSettings.styl';


export const PredictionsSettings = () => {
  const api = useAPI();
  const { project, fetchProject } = useContext(ProjectContext);
  const [mlError, setMLError] = useState();
  const [versions, setVersions] = useState([]);
  const [collab, setCollab] = useState(null);
  const [activeVersion, setActiveVersion] = useState();
  // const [editEnable, setEditEnable] = useState();

  const edittable = ! project.evaluate_predictions_automatically;

  const fetchVersions = useCallback(async () => {
    const versions = await api.callApi('projectModelVersions', {
        params: {
            pk: project.id,
            extended: true
        }
    });
      
    if (versions) setVersions(versions.static);
  }, [project, setVersions]);
        
  useEffect(() => {
    if (project.id) {
      fetchVersions();
      setActiveVersion(project.model_version);
    }
  }, [project]);

    return (
      <Block name="pred-settings">
        <Elem name={'wrapper'}>                
          
          { versions.length > 0 &&
            <Description style={{ marginTop: 0, maxWidth: 680 }}>
              List of predictions available in the project.
              To learn about how to import predictions,
              {" "}
              <a href="https://labelstud.io/guide/predictions.html" target="_blank">
                see the documentation
              </a>.
            </Description>
          }

          { versions.length > 0 &&
              <Elem name={"title-block"}>
                <Elem name={"title"}>Predictions List</Elem>
                <Caption>Each card is associated with separate model version.</Caption>
              </Elem>
            }
          
          { versions.length == 0 && <EmptyState  icon={<IconEmptyPredictions />}
                 title="No predictions yet uploaded"
                 description="Predictions could be used to prelabel the data, or validate the model. You can upload and select predictions from multiple model versions. You can also connect live models in the Model tab."
    
                 footer={ <div>Need help?<br/><a href="https://labelstud.io/guide/predictions" target="_blank">Learn more on how to upload predictions in our docs</a></div>} /> 
            }
          
          <PredictionsList project={project} versions={versions} fetchVersions={fetchVersions} />
          
          <Divider height={32}/>
        </Elem>
      </Block>
    );
};

PredictionsSettings.title = "Predictions";
PredictionsSettings.path = "/predictions";
