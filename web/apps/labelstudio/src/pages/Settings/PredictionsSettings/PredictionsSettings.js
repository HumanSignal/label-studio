import { useCallback, useContext, useEffect, useState } from 'react';
import { Description } from '../../../components/Description/Description';
import { Divider } from '../../../components/Divider/Divider';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { Caption } from '../../../components/Caption/Caption';
import { IconEmptyPredictions } from '../../../assets/icons';
import { useAPI } from '../../../providers/ApiProvider';
import { ProjectContext } from '../../../providers/ProjectProvider';
import { Spinner } from '../../../components/Spinner/Spinner';
import { PredictionsList } from './PredictionsList';
import { Block, Elem } from '../../../utils/bem';
import './PredictionsSettings.styl';

export const PredictionsSettings = () => {
  const api = useAPI();
  const { project } = useContext(ProjectContext);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    const versions = await api.callApi('projectModelVersions', {
      params: {
        pk: project.id,
        extended: true,
      },
    });

    if (versions) setVersions(versions.static);
    setLoading(false);
    setLoaded(true);
  }, [project, setVersions]);

  useEffect(() => {
    if (project.id) {
      fetchVersions();
    }
  }, [project]);

  return (
    <Block name="prediction-settings">
      <Elem name={'wrapper'}>
        {loading && <Spinner size={32} />}

        {loaded && versions.length > 0 && (
          <Description style={{ marginTop: 0, maxWidth: 680 }}>
            List of predictions available in the project. To learn about how to
            import predictions,{' '}
            <a
              href="https://labelstud.io/guide/predictions.html"
              target="_blank"
            >
              see the documentation
            </a>
            .
          </Description>
        )}

        {loaded && versions.length > 0 && (
          <Elem name={'title-block'}>
            <Elem name={'title'}>Predictions List</Elem>
            <Caption>
              Each card is associated with separate model version.
            </Caption>
          </Elem>
        )}

        {loaded && versions.length === 0 && (
          <EmptyState
            icon={<IconEmptyPredictions />}
            title="No predictions yet uploaded"
            description="Predictions could be used to prelabel the data, or validate the model. You can upload and select predictions from multiple model versions. You can also connect live models in the Model tab."
            footer={(
              <div>
                Need help?
                <br />
                <a
                  href="https://labelstud.io/guide/predictions"
                  target="_blank"
                >
                  Learn more on how to upload predictions in our docs
                </a>
              </div>
            )}
          />
        )}

        <PredictionsList
          project={project}
          versions={versions}
          fetchVersions={fetchVersions}
        />

        <Divider height={32} />
      </Elem>
    </Block>
  );
};

PredictionsSettings.title = 'Predictions';
PredictionsSettings.path = '/predictions';
