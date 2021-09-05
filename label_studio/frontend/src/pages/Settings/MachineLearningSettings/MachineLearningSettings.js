import { useCallback, useContext, useEffect, useState } from 'react';
import { Button } from '../../../components';
import { Description } from '../../../components/Description/Description';
import { Divider } from '../../../components/Divider/Divider';
import { ErrorWrapper } from '../../../components/Error/Error';
import { InlineError } from '../../../components/Error/InlineError';
import { Form, Input, Label, Select, TextArea, Toggle } from '../../../components/Form';
import { modal } from '../../../components/Modal/Modal';
import { useAPI } from '../../../providers/ApiProvider';
import { ProjectContext } from '../../../providers/ProjectProvider';
import { MachineLearningList } from './MachineLearningList';
import './MachineLearningSettings.styl';
import { useTranslation } from "react-i18next";
import "../../../translations/i18n";
import i18n from "i18next";

export const MachineLearningSettings = () => {
  const { t } = useTranslation();

  const api = useAPI();
  const {project, fetchProject, updateProject} = useContext(ProjectContext);
  const [mlError, setMLError] = useState();
  const [backends, setBackends] = useState([]);
  const [versions, setVersions] = useState([]);

  const resetMLVersion = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    await updateProject({
      model_version: null,
    });
  }, [api, project]);

  const fetchBackends = useCallback(async () => {
    const models = await api.callApi('mlBackends', {
      params: {
        project: project.id,
      },
    });


    if (models) setBackends(models);
  }, [api, project, setBackends]);

  const fetchMLVersions = useCallback(async () => {
    const versions = await api.callApi("modelVersions", {
      params: {
        pk: project.id,
      },
    });

    setVersions(versions);
  }, [api, project.id]);

  const showMLFormModal = useCallback((backend) => {
    const action = backend ? "updateMLBackend" : "addMLBackend";
    const modalProps = {
      title: `${backend ? 'Edit' : 'Add'} model`,
      style: { width: 760 },
      closeOnClickOutside: false,
      body: (
        <Form
          action={action}
          formData={{ ...(backend ?? {}) }}
          params={{ pk: backend?.id }}
          onSubmit={async (response) => {
            if (!response.error_message) {
              await fetchBackends();
              modalRef.close();
            }
          }}
        >
          <Input type="hidden" name="project" value={project.id}/>

          <Form.Row columnCount={2}>
            <Input name="title" label={t("title")} placeholder={t("MLModel")}/>
            <Input name="url" label="URL" required/>
          </Form.Row>

          <Form.Row columnCount={1}>
            <TextArea name="description" label={t("description")} style={{minHeight: 120}}/>
          </Form.Row>

          <Form.Actions>
            <Button type="submit" look="primary" onClick={() => setMLError(null)}>
              Validate and Save
            </Button>
          </Form.Actions>

          <Form.ResponseParser>{response => (
            <>
              {response.error_message && (
                <ErrorWrapper error={{
                  response: {
                    detail: `Failed to ${backend ? 'save' : 'add new'} ML backend.`,
                    exc_info: response.error_message,
                  },
                }}/>
              )}
            </>
          )}</Form.ResponseParser>

          <InlineError/>
        </Form>
      ),
    };

    const modalRef = modal(modalProps);
  }, [project, fetchBackends, mlError]);

  useEffect(() => {
    if (project.id) {
      fetchBackends();
      fetchMLVersions();
    }
  }, [project]);

  return (
    <>
      <Description style={{marginTop: 0, maxWidth: 680}}>
        {t("addOneOrMore")}
        {" "}
        <a href="https://labelstud.io/guide/predictions.html" target="_blank">
          {t("seeTheDocumentation")}
        </a>.
      </Description>
      <Button onClick={() => showMLFormModal()}>
        {t("addModel")}
      </Button>

      <Divider height={32}/>

      <Form action="updateProject"
        formData={{...project}}
        params={{pk: project.id}}
        onSubmit={() => fetchProject()}
        autosubmit
      >
        <Form.Row columnCount={1}>
          <Label text={t("assistedLabeling")} large/>

          <div style={{paddingLeft: 16}}>
            <Toggle
              label={t("startModel")}
              name="start_training_on_annotation_update"
            />
          </div>

          <div style={{paddingLeft: 16}}>
            <Toggle
              label={t("retrievePredictions")}
              name="evaluate_predictions_automatically"
            />
          </div>

          <div style={{paddingLeft: 16}}>
            <Toggle
              label={t("showPredictions")}
              name="show_collab_predictions"
            />
          </div>
        </Form.Row>

        {versions.length > 1 && (
          <Form.Row columnCount={1}>
            <Label
              text={t("modelVersion")}
              description={t("modelVersionAllows")}
              style={{marginTop: 16}}
              large
            />

            <div style={{display: 'flex', alignItems: 'center', width: 400, paddingLeft: 16}}>
              <div style={{flex: 1, paddingRight: 16}}>
                <Select
                  name="model_version"
                  defaultValue={null}
                  options={[
                    ...versions,
                  ]}
                  placeholder={t("noModelVersion")}
                />
              </div>

              <Button onClick={resetMLVersion}>
                Reset
              </Button>
            </div>

          </Form.Row>
        )}
      </Form>

      <MachineLearningList
        onEdit={(backend) => showMLFormModal(backend)}
        fetchBackends={fetchBackends}
        backends={backends}
      />
    </>
  );
};

MachineLearningSettings.title = i18n.t("machineLearning");
MachineLearningSettings.path = "/ml";
