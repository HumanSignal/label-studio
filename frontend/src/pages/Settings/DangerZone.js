import { useMemo, useState } from "react";
import { useHistory } from "react-router";
import { Button } from "../../components";
import { Label } from "../../components/Form";
import { confirm } from "../../components/Modal/Modal";
import { Space } from "../../components/Space/Space";
import { Spinner } from "../../components/Spinner/Spinner";
import { useAPI } from "../../providers/ApiProvider";
import { useProject } from "../../providers/ProjectProvider";

export const DangerZone = () => {
  const {project} = useProject();
  const api = useAPI();
  const history = useHistory();
  const [processing, setProcessing] = useState(null);

  const handleOnClick = (type) => () => {
    confirm({
      title: "Action confirmation",
      body: "You're about to delete all things. This action cannot be undone.",
      okText: "Proceed",
      buttonLook: "destructive",
      onOk: async () => {
        setProcessing(type);
        if(type === 'annotations') {
          // console.log('delete annotations');
        } else if(type === 'tasks') {
          // console.log('delete tasks');
        } else if(type === 'predictions') {
          // console.log('delete predictions');
        } else if(type === 'tabs') {
          await api.callApi('deleteTabs', {
            body: {
              project: project.id,
            },
          });
        } else if(type === 'project') {
          await api.callApi('deleteProject', {
            params: {
              pk: project.id,
            },
          });
          history.replace('/projects');
        }
        setProcessing(null);
      },
    });
  };

  const buttons = useMemo(() => [{
    type: 'annotations',
    disabled: true, //&& !project.total_annotations_number,
    label: `Delete ${project.total_annotations_number} Annotations`,
  }, {
    type: 'tasks',
    disabled: true, //&& !project.task_number,
    label: `Delete ${project.task_number} Tasks`,
  }, {
    type: 'predictions',
    disabled: true, //&& !project.total_predictions_number,
    label: `Delete ${project.total_predictions_number} Predictions`,
  }, {
    type: 'tabs',
    label: `Drop All Tabs`,
  }, {
    type: 'project',
    label: 'Delete Project',
  }], [project]);

  return (
    <div style={{width: 480}}>
      <Label
        text="Delete Annotations, Tasks, or Project"
        description="Perform these actions at your own risk. Actions you take on this page can't be reverted. Make sure your data is backed up."
        style={{display: 'block', width: 415}}
      />

      {project.id ? (
        <Space direction="vertical" spread style={{marginTop: 32}}>
          {buttons.map((btn) => {
            const waiting = processing === btn.type;
            const disabled = btn.disabled || (processing && !waiting);
            return (btn.disabled !== true) && (
              <Button key={btn.type} look="danger" disabled={disabled} waiting={waiting} onClick={handleOnClick(btn.type)}>
                {btn.label}
              </Button>
            );
          })}
        </Space>
      ) : (
        <div style={{display: "flex", justifyContent: "center", marginTop: 32}}>
          <Spinner size={32}/>
        </div>
      )}
    </div>
  );
};

DangerZone.title = "Danger Zone";
DangerZone.path = "/danger-zone";
