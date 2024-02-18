import React from 'react';

import { formatDistanceToNow, parseISO } from 'date-fns';
import { useEffect, useCallback, useContext } from 'react';
import { FaEllipsisV } from 'react-icons/fa';
import truncate from 'truncate-middle';
import { LsEllipsis, IconPredictions, IconInfoOutline } from "../../../assets/icons";
import { Button, Card, Dropdown, Menu, Checkbox, ToggleItems } from '../../../components';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { DescriptionList } from '../../../components/DescriptionList/DescriptionList';
import { confirm } from '../../../components/Modal/Modal';
import { Oneof } from '../../../components/Oneof/Oneof';
import { ApiContext } from '../../../providers/ApiProvider';
import { Block, Elem, cn } from '../../../utils/bem';
import { Form, Input, Label, TextArea, Toggle, Select } from '../../../components/Form';

import './PredictionsList.styl';


export const PredictionsList = ({ project, versions, fetchVersions }) => {
  const api = useContext(ApiContext);   
  
  const onDelete = useCallback(async (version) => {
    await api.callApi('deletePredictions', {
      params: {
        pk: project.id,        
      },
      body: {
        model_version: version.model_version
      }
    });
    await fetchVersions();
  }, [fetchVersions, api]);
  
    return (
        <div style={{ maxWidth: 680 }}>          
          { versions.map(v => <VersionCard key={v.model_version}
                                          version={v}
                                          onDelete={onDelete} />) }
      </div>
  );
};

const VersionCard = ({ version, selected, onSelect, edittable, onDelete }) => {
    const rootClass = cn("predictionCard");
    const disabledStyle = {
        opacity: edittable ? "1" : 0.3
    };

  const confirmDelete = useCallback((version) => {
    confirm({
      title: "Delete Predictions",
      body: "This action cannot be undone. Are you sure?",
      buttonLook: "destructive",
      onOk(){ onDelete?.(version); },
    });
  }, [version, onDelete]);

  
    return (
      <Block name="predictionCard">
        <div>
          <div className={rootClass.elem("title")}>
            <b>{version.model_version}</b>
            { version.model_version === "undefined" &&
              <Tooltip title="Model version is undefined. Likely means that model_version field was missing when predictions were imported.">
                <IconInfoOutline className={cn('help-icon')} width="14" height="14" />
              </Tooltip>
            }
          </div>
          <div className={rootClass.elem("meta")}>
            <div className={rootClass.elem("group")}><IconPredictions /> {version.count}</div>
            <div className={rootClass.elem("group")}>Last Prediction: 
              {formatDistanceToNow(parseISO(version.latest), { addSuffix: true })}
            </div>            
          </div>
        </div>
        <div className={rootClass.elem("menu")}>
          <Dropdown.Trigger align="right" content={(
            <Menu size="medium" contextual>
              <Menu.Item onClick={() => confirmDelete(version)} isDangerous>Delete</Menu.Item>
            </Menu>
          )}>
            <Button type="link" icon={<LsEllipsis/>} style={{ padding: "15px" }} />
          </Dropdown.Trigger>
        </div>        
      </Block>
    );
};
