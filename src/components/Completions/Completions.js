import React, { Component } from "react";
import { observer } from "mobx-react";
import { List } from "semantic-ui-react";
import { Card, Button, Icon, Tooltip, Badge } from "antd";

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
      Ground Truth
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
      Ground Truth
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
    completionID = "New Completion";
  } else {
    if (item.pk) {
      completionID = `ID ${item.pk}`;
    } else if (item.id) {
      completionID = `ID ${item.id}`;
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

  return (
    <List.Item
      className={item.selected ? `${styles.completion} ${styles.completion_selected}` : styles.completion}
      onClick={ev => {
        !item.selected && store.completionStore.selectCompletion(item.id);
      }}
    >
      <List.Content>
        <List.Header as="a" style={{ marginBottom: "1em" }}>
          {badge}
          {completionID}
        </List.Header>

        <List.Description as="a">
          Created
          <i>{item.createdAgo ? ` ${item.createdAgo} ago` : ` ${Utils.UDate.prettyDate(item.createdDate)}`}</i>
          {item.createdBy ? ` by ${item.createdBy}` : null}
        </List.Description>

        {item.selected && (
          <div className={styles.buttons}>
            <Tooltip placement="topLeft" title="Delete selected completion">
              <Button
                type="danger"
                onClick={ev => {
                  ev.preventDefault();
                  item.store.deleteCompletion(item);
                }}
              >
                Delete
              </Button>
            </Tooltip>

            {item.honeypot ? removeHoney() : setHoney()}
          </div>
        )}
      </List.Content>
    </List.Item>
  );
});

class Completions extends Component {
  render() {
    const { store } = this.props;

    let content = [];
    let title = (
      <div className={styles.title}>
        <h3>Completions</h3>
        <Tooltip placement="topLeft" title="Add new completion">
          <Button
            onClick={ev => {
              ev.preventDefault();
              store.completionStore.addUserCompletion();
            }}
          >
            <Icon type="plus" />
          </Button>
        </Tooltip>
      </div>
    );

    store.completionStore.savedCompletions.forEach(c => {
      if (c) {
        content.push(<Completion key={c.pk} item={c} store={store} />);
      }
    });

    return (
      <Card title={title} bodyStyle={{ padding: "0", paddingTop: "1px" }}>
        <List divided relaxed>
          {store.completionStore.savedCompletions ? content : <p>No completions submitted yet</p>}
        </List>
      </Card>
    );
  }
}

export default observer(Completions);
