
import React from 'react';

import { formatDistanceToNow, parseISO } from 'date-fns';
import { useEffect, useCallback, useContext, useState } from 'react';
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

// import './PredictionsList.styl';


export const PrelabelingSelector = ({ edittable, versions, selectedVersion, onSelect }) => {

  const [hversions, setHVersions] = useState([]);
  const [ver, setVer] = React.useState(null); 

  if (versions) {
      setHVersions(Object.entries(versions).reduce((v, [key, value]) => [...v, {
        value: key,
        label: `${key} (${value} predictions)`,
      }], []));
  }
  
  useEffect(() => {
    setVer(selectedVersion);
  }, [selectedVersion]);
  
  return (
    <div style={{ maxWidth: 680 }}>
      <Form.Row columnCount={1}>
      <Label
        text="Model Version"
        description={(
          <>
            Model version allows you to specify which prediction will be shown to the annotators.
            {ver && (
              <>
                <br />
                <b>Current project model version: {ver}</b>
              </>
            )}
          </>
        )}
        style={{ marginTop: 16 }}
        large
      />
	<Select
            name={"model_version"}
            disabled={!hversions.length}
            value={selectedVersion}
            onChange={e => setVer(e.target.value)}
            options={hversions}
            placeholder={"Not selected"}
            
          />
      </Form.Row>
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
            
            {/* <Checkbox style={disabledStyle} name="model_version_cb" value={version.model_version} checked={selected} onChange={(e) => { onSelect(e.target.value) }} disabled={! edittable} /> */}
            
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
