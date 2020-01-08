import React, { Component } from "react";
import { Card, Button, Icon, Tooltip, Badge, List, Popconfirm } from "antd";
import { observer } from "mobx-react";

import Utils from "../../utils";
import styles from "./Completions.module.scss";

const Completion = observer(({ item, store }) => {
  let removeHoney = () => (
    <Tooltip placement="topLeft" title="Unset this result as a ground truth">
      <Button
        size="small"
        type="primary"
        onClick={ev => {
          ev.preventDefault();
          item.setGroundTruth(false);
        }}
      >
        <Icon type="star" />
      </Button>
    </Tooltip>
  );

  let setHoney = () => (
    <Tooltip placement="topLeft" title="Set this result as a ground truth">
      <Button
        size="small"
        type="primary"
        ghost={true}
        onClick={ev => {
          ev.preventDefault();
          item.setGroundTruth(true);
        }}
      >
        <Icon type="star" />
      </Button>
    </Tooltip>
  );

  /**
   * Default badge for saved completions
   */
  let badge = <Badge status="default" />;

  /**
   *
   */
  let completionID;

  /**
   * Title of card
   */
  if (item.userGenerate && !item.sentUserGenerate) {
    completionID = <span className={styles.title}>New completion</span>;
  } else {
    if (item.pk) {
      completionID = <span className={styles.title}>ID {item.pk}</span>;
    } else if (item.id) {
      completionID = <span className={styles.title}>ID {item.id}</span>;
    }
  }

  /**
   * Badge for processing of user generate completion
   */
  if (item.userGenerate) {
    badge = <Badge status="processing" />;
  }

  /**
   * Badge for complete of user generate completion
   */
  if (item.userGenerate && item.sentUserGenerate) {
    badge = <Badge status="success" />;
  }

  const btnsView = () => {
    const confirm = () => {
      // ev.preventDefault();
      // debugger;
      item.list.deleteCompletion(item);
    };

    return (
      <div className={styles.buttons}>
        {true && (item.honeypot ? removeHoney() : setHoney())}
        &nbsp;
        {store.hasInterface("completions:delete") && (
          <Tooltip placement="topLeft" title="Delete selected completion">
            <Popconfirm
              placement="bottomLeft"
              title={"Please confirm you want to delete this completion"}
              onConfirm={confirm}
              okText="Delete"
              okType="danger"
              cancelText="Cancel"
            >
              <Button size="small" type="danger">
                <Icon type="delete" />
              </Button>
            </Popconfirm>
          </Tooltip>
        )}
      </div>
    );
  };

  return (
    <List.Item
      key={item.id}
      className={item.selected ? `${styles.completion} ${styles.completion_selected}` : styles.completion}
      onClick={ev => {
        !item.selected && store.completionStore.selectCompletion(item.id);
      }}
    >
      <div className={styles.completioncard}>
        <div>
          <div className={styles.title}>
            {badge}
            {completionID}
          </div>
          Created
          <i>{item.createdAgo ? ` ${item.createdAgo} ago` : ` ${Utils.UDate.prettyDate(item.createdDate)}`}</i>
          {item.createdBy ? ` by ${item.createdBy}` : null}
        </div>
        {item.selected && btnsView()}
      </div>
    </List.Item>
  );
});

class Completions extends Component {
  render() {
    const { store } = this.props;

    let title = (
      <div className={styles.title + " " + styles.titlespace}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h3>Completions</h3>
        </div>

        <div>
          {store.hasInterface("completions:add-new") && (
            <Tooltip placement="topLeft" title="Add a new completion">
              <Button
                shape={"circle"}
                onClick={ev => {
                  ev.preventDefault();
                  const c = store.completionStore.addCompletion({ userGenerate: true });
                  store.completionStore.selectCompletion(c.id);
                  // c.list.selectCompletion(c);
                }}
              >
                <Icon type="plus" />
              </Button>
            </Tooltip>
          )}
          &nbsp;&nbsp;
          <Tooltip placement="topLeft" title="View all completions">
            <Button
              shape={"circle"}
              type={store.completionStore.viewingAllCompletions ? "primary" : ""}
              onClick={ev => {
                ev.preventDefault();
                store.completionStore.toggleViewingAllCompletions();
              }}
            >
              <Icon type="windows" />
            </Button>
          </Tooltip>
        </div>
      </div>
    );

    const content = store.completionStore.completions.map(c => <Completion key={c.id} item={c} store={store} />);

    return (
      <Card title={title} size="small" bodyStyle={{ padding: "0", paddingTop: "1px" }}>
        <List>{store.completionStore.completions ? content : <p>No completions submitted yet</p>}</List>
      </Card>
    );
  }
}

export default observer(Completions);
