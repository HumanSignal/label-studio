import React, { Component } from "react";
import { observer } from "mobx-react";
import { Card } from "antd";
import { List } from "semantic-ui-react";
import Utils from "../../utils";
import styles from "../Completions/Completions.module.scss";

const Prediction = observer(({ item, store }) => {
  return (
    <List.Item
      className={item.selected ? `${styles.completion} ${styles.completion_selected}` : styles.completion}
      onClick={ev => {
        !item.selected && store.completionStore.selectPrediction(item.id);
      }}
    >
      <List.Content>
        <List.Header as="a" style={{ marginBottom: "1em" }}>
          {item.createdBy ? `Model (v. ${item.createdBy})` : null}
        </List.Header>
        <List.Description as="a" style={{ marginBottom: "1em" }}>
          Created
          <i>{item.createdAgo ? ` ${item.createdAgo} ago` : ` ${Utils.UDate.prettyDate(item.createdDate)}`}</i>
        </List.Description>
      </List.Content>
    </List.Item>
  );
});

class Predictions extends Component {
  render() {
    const { store } = this.props;

    let content = [];

    store.completionStore.predictions &&
      store.completionStore.predictions.map(predict => {
        if (predict) {
          content.push(<Prediction key={predict.pk} item={predict} store={store} />);
        }
      });

    return (
      <Card title="Predictions" bodyStyle={{ padding: "0" }}>
        <List>
          {store.completionStore.predictions && store.completionStore.predictions.length ? (
            content
          ) : (
            <List.Item>
              <List.Description>
                <div style={{ padding: "1em 24px" }}>No predictions</div>
              </List.Description>
            </List.Item>
          )}
        </List>
      </Card>
    );
  }
}

export default observer(Predictions);
