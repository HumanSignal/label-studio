import React from 'react';

import { formatDistanceToNow, parseISO } from 'date-fns';
import { useEffect, useCallback, useContext } from 'react';
import { FaEllipsisV } from 'react-icons/fa';
import truncate from 'truncate-middle';
import { IconPredictions, IconInfoOutline } from "../../../assets/icons";
import { Button, Card, Dropdown, Menu, Checkbox, ToggleItems } from '../../../components';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { DescriptionList } from '../../../components/DescriptionList/DescriptionList';
import { confirm } from '../../../components/Modal/Modal';
import { Oneof } from '../../../components/Oneof/Oneof';
import { ApiContext } from '../../../providers/ApiProvider';
import { Block, Elem, cn } from '../../../utils/bem';
import { Form, Input, Label, TextArea, Toggle, Select } from '../../../components/Form';

import './PredictionsList.styl';


export const PredictionsList = ({ edittable, versions, selectedVersion, onSelect }) => {
    const [ver, setVer] = React.useState(null); 

  useEffect(() => {
    setVer(selectedVersion);
  }, [selectedVersion]);
  
    return (
        <div style={{ maxWidth: 680 }}>          
          { versions.map(v => <VersionCard key={v.model_version}
                                          version={v}
                                          selected={ver == v.model_version}
                                          onSelect={(version) => {
					    setVer(version);
					    onSelect(version);
					  }}
                                          edittable={edittable} />) }
      </div>
  );
};

const VersionCard = ({ version, selected, onSelect, edittable }) => {
    const rootClass = cn("predictionCard");
    const disabledStyle = {
        opacity: edittable ? "1" : 0.3
    };
  
    return (
        <Block name="predictionCard">
          <div className={rootClass.elem("title")}>
            
            <Checkbox style={disabledStyle} name="model_version_cb" value={version.model_version} checked={selected} onChange={(e) => { onSelect(e.target.value) }} disabled={! edittable} />            
            <b>{version.model_version}</b>
            { version.model_version === "undefined" &&
                  <Tooltip title="Model version is undefined. Likely means that model_version field was missing when predictions were imported.">
                    <IconInfoOutline className={cn('help-icon')} width="14" height="14" />
                  </Tooltip>
          }</div>
          <div className={rootClass.elem("meta")}>
            <div className={rootClass.elem("group")}><IconPredictions /> {version.count}</div>
            <div className={rootClass.elem("group")}>Last Prediction: 
              {formatDistanceToNow(parseISO(version.latest), { addSuffix: true })}
            </div>            
          </div>        
        </Block>
    );
};
