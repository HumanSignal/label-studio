import React, { useCallback, useContext } from "react";

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { IconInfoOutline, IconPredictions, LsEllipsis } from "../../../assets/icons";
import { Button, Dropdown, Menu } from "../../../components";
import { Tooltip } from "../../../components/Tooltip/Tooltip";
import { confirm } from "../../../components/Modal/Modal";
import { ApiContext } from "../../../providers/ApiProvider";
import { Block, cn } from "../../../utils/bem";

import "./PredictionsList.scss";

export const PredictionsList = ({ project, versions, fetchVersions }) => {
  const api = useContext(ApiContext);

  const onDelete = useCallback(
    async (version) => {
      await api.callApi("deletePredictions", {
        params: {
          pk: project.id,
        },
        body: {
          model_version: version.model_version,
        },
      });
      await fetchVersions();
    },
    [fetchVersions, api],
  );

  return (
    <div style={{ maxWidth: 680 }}>
      {versions.map((v) => (
        <VersionCard key={v.model_version} version={v} onDelete={onDelete} />
      ))}
    </div>
  );
};

const VersionCard = ({ version, selected, onSelect, editable, onDelete }) => {
  const rootClass = cn("prediction-card");

  const confirmDelete = useCallback(
    (version) => {
      confirm({
        title: "Delete Predictions",
        body: "This action cannot be undone. Are you sure?",
        buttonLook: "destructive",
        onOk() {
          onDelete?.(version);
        },
      });
    },
    [version, onDelete],
  );

  return (
    <Block name="prediction-card">
      <div>
        <div className={rootClass.elem("title")}>
          {version.model_version}
          {version.model_version === "undefined" && (
            <Tooltip title="Model version is undefined. Likely means that model_version field was missing when predictions were imported.">
              <IconInfoOutline className={cn("help-icon")} width="14" height="14" />
            </Tooltip>
          )}
        </div>
        <div className={rootClass.elem("meta")}>
          <div className={rootClass.elem("group")}>
            <IconPredictions />
            &nbsp;{version.count}
          </div>
          <div className={rootClass.elem("group")}>
            Last prediction created&nbsp;
            <Tooltip title={format(parseISO(version.latest), "yyyy-MM-dd HH:mm:ss")}>
              <span>{formatDistanceToNow(parseISO(version.latest), { addSuffix: true })}</span>
            </Tooltip>
          </div>
        </div>
      </div>
      <div className={rootClass.elem("menu")}>
        <Dropdown.Trigger
          align="right"
          content={
            <Menu size="medium" contextual>
              <Menu.Item onClick={() => confirmDelete(version)} isDangerous>
                Delete
              </Menu.Item>
            </Menu>
          }
        >
          <Button type="link" icon={<LsEllipsis />} style={{ padding: "15px" }} />
        </Dropdown.Trigger>
      </div>
    </Block>
  );
};
