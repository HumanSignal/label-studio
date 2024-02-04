import { format, isValid, formatDistanceToNow, parseISO } from 'date-fns';
import { useCallback, useContext } from 'react';
import { FaEllipsisV } from 'react-icons/fa';
import truncate from 'truncate-middle';
import { Button, Card, Dropdown, Menu } from '../../../components';
import { DescriptionList } from '../../../components/DescriptionList/DescriptionList';
import { confirm } from '../../../components/Modal/Modal';
import { Oneof } from '../../../components/Oneof/Oneof';
import { ApiContext } from '../../../providers/ApiProvider';
import { Block, cn } from '../../../utils/bem';

import './MachineLearningList.styl';


export const MachineLearningListNew = ({ backends, fetchBackends, onEdit, onTestRequest, onStartTraining }) => {
  
  const api = useContext(ApiContext);

  const onDeleteModel = useCallback(async (backend) => {
    await api.callApi('deleteMLBackend', {
      params: {
        pk: backend.id,
      },
    });
    await fetchBackends();
  }, [fetchBackends, api]);

  return (
    <div>
      {backends.map(backend => (
        <BackendCard
          key={backend.id}
          backend={backend}
          onStartTrain={onStartTraining}
          onDelete={onDeleteModel}
          onEdit={onEdit}
          onTestRequest={onTestRequest}
        />
      ))}
    </div>
  );
};

const BackendCard = ({ backend, onStartTrain, onEdit, onDelete, onTestRequest }) => {
  const confirmDelete = useCallback((backend) => {
    confirm({
      title: "Delete ML Backend",
      body: "This action cannot be undone. Are you sure?",
      buttonLook: "destructive",
      onOk(){ onDelete?.(backend); },
    });
  }, [backend, onDelete]);

  const rootClass = cn("backendCard");
    
    return (
        <Block name="backendCard">
          <div className={rootClass.elem("titleBlk")}>
            <div>
              <BackendState backend={backend}/>
              <div className={rootClass.elem("title")}>
                <b>{backend.title}</b>
              </div>
              
            </div>
            <div className={rootClass.elem("menu")}>
              <Dropdown.Trigger align="right" content={(
                <Menu size="medium">
                    <Menu.Item onClick={() => onTestRequest(backend)}>Send Test Request</Menu.Item>
                    <Menu.Item onClick={() => onStartTrain(backend)}>Start Training</Menu.Item>
                    
                    <Menu.Item onClick={() => onEdit(backend)}>Edit</Menu.Item>
                    <Menu.Item onClick={() => confirmDelete(backend)}>Delete</Menu.Item>
                  </Menu>
              )}>
                <Button type="link" icon={<FaEllipsisV/>} style={{ padding: "15px" }} />
              </Dropdown.Trigger>
              
            </div>
          </div>
          <div className={rootClass.elem("meta")}>
            <div className={rootClass.elem("group")}>{truncate(backend.url, 20, 10, '...')}</div>
            <div className={rootClass.elem("group")}></div>
            <div className={rootClass.elem("group")}>Created &nbsp;
              {formatDistanceToNow(parseISO(backend.created_at), { addSuffix: true })}              
            </div>            
          </div>        
        </Block>
    );
};

const BackendState = ({ backend }) => {
  const { state } = backend;

  return (
    <div className={cn('ml').elem('status')}>
      <span className={cn('ml').elem('indicator').mod({ state })}></span>
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
