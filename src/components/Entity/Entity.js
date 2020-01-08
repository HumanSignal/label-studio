import React, { Fragment } from "react";
import { observer } from "mobx-react";
import { getType } from "mobx-state-tree";
import { Form, Input, Icon, Button, Tag, Tooltip } from "antd";

import { NodeMinimal } from "../Node/Node";
import Hint from "../Hint/Hint";
import styles from "./Entity.module.scss";

const templateElement = element => {
  return (
    <div key={element.pid} className={styles.labels}>
      Labels:&nbsp;
      {element.getSelectedNames().map(title => {
        let bgColor = element.findLabel(title).background ? element.findLabel(title).background : "#000000";

        return (
          <Tag key={element.findLabel(title).id} color={bgColor} className={styles.tag}>
            {title}
          </Tag>
        );
      })}
    </div>
  );
};

const RenderStates = ({ node }) => {
  const _render = s => {
    if (
      getType(s).name === "LabelsModel" ||
      getType(s).name === "RectangleLabelsModel" ||
      getType(s).name === "PolygonLabelsModel" ||
      getType(s).name === "KeyPointLabelsModel" ||
      getType(s).name === "BrushLabelsModel"
    ) {
      return templateElement(s);
    } else if (getType(s).name === "RatingModel") {
      return <p>Rating: {s.getSelectedString()}</p>;
    }

    return null;
  };

  return <Fragment>{node.states.map(s => _render(s))}</Fragment>;
};

export default observer(({ store, completion }) => {
  const node = completion.highlightedNode;

  return (
    <Fragment>
      <p>
        <NodeMinimal node={node} /> (id: {node.id})
      </p>

      {node.normalization && (
        <p>
          Normalization: {node.normalization}
          <Icon
            name="delete"
            style={{ cursor: "pointer" }}
            onClick={() => {
              node.deleteNormalization();
            }}
          />
        </p>
      )}
      {node.states && <RenderStates node={node} />}

      {node.completion.edittable == true && (
        <div className={styles.block + " ls-entity-buttons"}>
          <Tooltip placement="topLeft" title="Create Relation">
            <Button
              className={styles.button}
              onClick={() => {
                completion.startRelationMode(node);
              }}
            >
              <Icon type="link" />
            </Button>
          </Tooltip>

          <Tooltip placement="topLeft" title="Create Normalization">
            <Button
              className={styles.button}
              onClick={() => {
                completion.setNormalizationMode(true);
              }}
            >
              <Icon type="plus" />
            </Button>
          </Tooltip>

          <Tooltip placement="topLeft" title="Unselect">
            <Button
              className={styles.button}
              type="dashed"
              onClick={() => {
                completion.highlightedNode.unselectRegion();
              }}
            >
              <Icon type="fullscreen-exit" />
            </Button>
          </Tooltip>

          <Tooltip placement="topLeft" title="Delete Entity">
            <Button
              type="danger"
              className={styles.button}
              onClick={() => {
                completion.highlightedNode.deleteRegion();
              }}
            >
              <Icon type="delete" />

              {store.settings.enableHotkeys && store.settings.enableTooltips && <Hint>[ Bksp ]</Hint>}
            </Button>
          </Tooltip>
        </div>
      )}
      {completion.normalizationMode && (
        <Form
          style={{ marginTop: "0.5em", marginBottom: "0.5em" }}
          onSubmit={ev => {
            node.setNormalization(node.normInput);
            completion.setNormalizationMode(false);

            ev.preventDefault();
            return false;
          }}
        >
          <Input
            onChange={ev => {
              const { value } = ev.target;
              node.setNormInput(value);
            }}
            style={{ marginBottom: "0.5em" }}
            placeholder="Add Normalization"
          />
          <Button type="primary" htmlType="submit" style={{ marginRight: "0.5em" }}>
            Add
          </Button>
          <Button
            type="danger"
            htmlType="reset"
            onClick={ev => {
              completion.setNormalizationMode(false);

              ev.preventDefault();
              return false;
            }}
          >
            Cancel
          </Button>
        </Form>
      )}
    </Fragment>
  );
});
