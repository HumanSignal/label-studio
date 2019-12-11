import React, { Component } from "react";
import { observer } from "mobx-react";
import { Card, Button, Icon, Tooltip, Badge, List } from "antd";

import Utils from "../../utils";
import styles from "./Completions.module.scss";

const Completion = observer(({ item, store }) => {
  let removeHoney = () => (
    <Button
      type="primary"
      onClick={ev => {
        ev.preventDefault();
        item.removeHoneypot();
      }}
    >
      <Icon type="star" />
    </Button>
  );

  let setHoney = () => (
    <Button
      type="primary"
      ghost={true}
      onClick={ev => {
        ev.preventDefault();
        item.setHoneypot();
      }}
    >
      <Icon type="star" />
    </Button>
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
    return (
      <div className={styles.buttons}>
        {store.hasInterface("completions:set-groundtruth") && (item.honeypot ? removeHoney() : setHoney())}
        {store.hasInterface("completions:delete") && (
          <Tooltip placement="topLeft" title="Delete selected completion">
            <Button
              type="danger"
              onClick={ev => {
                ev.preventDefault();
                item.store.deleteCompletion(item);
              }}
            >
              <Icon type="delete" />
            </Button>
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
      <div className={styles.title}>
        {badge}
        {completionID}
      </div>
      Created
      <i>{item.createdAgo ? ` ${item.createdAgo} ago` : ` ${Utils.UDate.prettyDate(item.createdDate)}`}</i>
      {item.createdBy ? ` by ${item.createdBy}` : null}
      {item.selected && btnsView()}
    </List.Item>
  );
});

class Completions extends Component {
  render() {
    const { store } = this.props;

    let content = [];
    let title = (
      <div className={styles.title + " " + styles.titlespace}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h3>Completions</h3>

          {store.hasInterface("completions:add-new") && (
            <Tooltip placement="topLeft" title="Add a new completion">
              <Button
                shape={"circle"}
                onClick={ev => {
                  ev.preventDefault();
                  store.completionStore.addUserCompletion();
                }}
              >
                <Icon type="plus" />
              </Button>
            </Tooltip>
          )}
        </div>

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
    );

    store.completionStore.savedCompletions.forEach(c => {
      if (c) {
        content.push(<Completion key={c.id} item={c} store={store} />);
      }
    });

    return (
      <Card title={title} bodyStyle={{ padding: "0", paddingTop: "1px" }}>
        <List>{store.completionStore.savedCompletions ? content : <p>No completions submitted yet</p>}</List>
      </Card>
    );
  }
}

export default observer(Completions);
