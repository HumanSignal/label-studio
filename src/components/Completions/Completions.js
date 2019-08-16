import React, { Component } from "react";
import { observer } from "mobx-react";
import { List } from "semantic-ui-react";
import { Card, Button } from "antd";

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
      Honeypot
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
      Honeypot
    </Button>
  );

  return (
    <List.Item
      style={{ backgroundColor: item.selected ? "#f8f8f9" : "white", padding: "1em" }}
      onClick={ev => {
        !item.selected && store.completionStore.selectCompletion(item.id);
      }}
    >
      <List.Content>
        <List.Header as="a">ID {item.pk || item.id}</List.Header>
        <p></p>
        <List.Description as="a">
          Created
          <i>{item.createdAgo ? ` ${item.createdAgo} ago` : ` ${Utils.UDate.prettyDate(item.createdDate)}`}</i>
          {item.createdBy ? ` by ${item.createdBy}` : null}
        </List.Description>

        {item.selected && (
          <div className={styles.buttons}>
            <Button
              type="danger"
              onClick={ev => {
                ev.preventDefault();
                item.store.deleteCompletion(item);
              }}
            >
              Delete
            </Button>

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

    let count = 0;
    console.log(store.completionStore.savedCompletions)
    store.completionStore.savedCompletions.map(c => {
      count += c.pk > 0;
    });

    if (count === 0) {
      return (
        <Card title="Completions">
          <List divided relaxed>
            <p>No completions submitted yet</p>
          </List>
        </Card>
      );
    }

    // show completions
    else {
      return (
        <Card title="Completions" bodyStyle={{ padding: 0 }}>
          <List divided relaxed>
            {store.completionStore.savedCompletions.map(
              c => c.pk > 0 && <Completion key={c.pk} item={c} store={store} />,
            )}
          </List>
        </Card>
      );
    }

    // return (
    //   <Card title="Completions" bodyStyle={{ padding: 0 }}>
    //     <List divided relaxed>
    //       {store.completionStore.savedCompletions.map(c => (
    //         <Completion key={c.id} item={c} store={store} />
    //       ))}
    //     </List>
    //   </Card>
    // );
  }
}

export default observer(Completions);
