import { format } from 'date-fns';
import { useCallback, useContext } from 'react';
import { FaEllipsisV } from 'react-icons/fa';
import truncate from 'truncate-middle';
import { Button, Card, Dropdown, Menu } from '../../../components';
import { DescriptionList } from '../../../components/DescriptionList/DescriptionList';
import { confirm } from '../../../components/Modal/Modal';
import { Oneof } from '../../../components/Oneof/Oneof';
import { ApiContext } from '../../../providers/ApiProvider';
import { cn } from '../../../utils/bem';
import axios from 'axios'
import Swal from 'sweetalert'
export const MachineLearningList = ({ backends, fetchBackends, onEdit }) => {
  const rootClass = cn('ml');
  const api = useContext(ApiContext);

  const onDeleteModel = useCallback(async (backend) => {
    await api.callApi('deleteMLBackend', {
      params: {
        pk: backend.id,
      },
    });
    await fetchBackends();
  }, [fetchBackends, api]);

  const onStartTraining = useCallback(async (backend) => {
    console.log('training')
    await axios
    .get('http://127.0.0.1:3535/can_press')
        .then((response) => {
          console.log(response);
          let can_press = response.data.can_press;
          if (can_press == undefined) {
            Swal('Someone has just trained or predicted, please wait for a moment')
          }
          else if (can_press == true) {
            Swal('Training has started')
             api.callApi('trainMLBackend', {
              params: {
                pk: backend.id,
              },
            });
          }
          else {
            Swal(`All Gpus are occupied, your training didn't start`)
          }
        })
    .catch((error) => {
        console.log(error);
    });
    await fetchBackends();
  }, [fetchBackends, api]);

  return (
    <div className={rootClass}>
      {backends.map(backend => (
        <BackendCard
          key={backend.id}
          backend={backend}
          onStartTrain={onStartTraining}
          onDelete={onDeleteModel}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};

const BackendCard = ({backend, onStartTrain, onEdit, onDelete}) => {
  const confirmDelete = useCallback((backend) => {
    confirm({
      title: "Delete ML Backend",
      body: "This action cannot be undone. Are you sure?",
      buttonLook: "destructive",
      onOk(){ onDelete?.(backend); },
    });
  }, [backend, onDelete]);

  return (
    <Card style={{marginTop: 0}} header={backend.title} extra={(
      <div className={cn('ml').elem('info')}>
        <BackendState backend={backend}/>

        <Dropdown.Trigger align="right" content={(
          <Menu size="small">
            <Menu.Item onClick={() => onEdit(backend)}>Edit</Menu.Item>
            <Menu.Item onClick={() => confirmDelete(backend)}>Delete</Menu.Item>
          </Menu>
        )}>
          <Button type="link" icon={<FaEllipsisV/>}/>
        </Dropdown.Trigger>
      </div>
    )}>
      <DescriptionList className={cn('ml').elem('summary')}>
        <DescriptionList.Item term="URL" termStyle={{whiteSpace: 'nowrap'}}>
          {truncate(backend.url, 20, 10, '...')}
        </DescriptionList.Item>
        {backend.description && (
          <DescriptionList.Item
            term="Description"
            children={backend.description}
          />
        )}
        <DescriptionList.Item term="Version">
          {backend.version ? format(new Date(backend.version), 'MMMM dd, yyyy ∙ HH:mm:ss') : 'unknown'}
        </DescriptionList.Item>
      </DescriptionList>

      <Button disabled={backend.state !== "CO"} onClick={() => onStartTrain(backend)}>
        Start Training
      </Button>
    </Card>
  );
};

const BackendState = ({backend}) => {
  const { state } = backend;
  return (
    <div className={cn('ml').elem('status')}>
      <span className={cn('ml').elem('indicator').mod({state})}></span>
      <Oneof value={state} className={cn('ml').elem('status-label')}>
        <span case="DI">Disconnected</span>
        <span case="CO">Connected</span>
        <span case="ER">Error</span>
        <span case="TR">Training</span>
        <span case="PR">Predicting</span>
      </Oneof>
    </div>
  );
};
