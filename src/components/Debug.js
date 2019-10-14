import React, { Component } from "react";
import { Form, Button } from "antd";

import { observer } from "mobx-react";

class DebugComponent extends Component {
  state = { res: null };

  render() {
    const self = this;
    const { store } = this.props;
    const completion = store.completionStore.selected;

    return (
      <div>
        <br />
        <h2>Debug</h2>

        <Button
          basic
          onClick={ev => {
            this.setState({ res: JSON.stringify(store.completionStore.selected.toJSON()) });
          }}
        >
          Serialize whole tree
        </Button>

        <Button
          basic
          onClick={ev => {
            this.setState({ res: JSON.stringify(store.completionStore.selected.serializeCompletion()) });
          }}
        >
          Seriealize results tree
        </Button>

        <Button
          basic
          onClick={ev => {
            if (self.state.res) completion.deserializeCompletion(JSON.parse(self.state.res));
          }}
        >
          Load Serialized Results
        </Button>

        <Button
          basic
          onClick={ev => {
            const c = store.completionStore.addInitialCompletion();
            store.completionStore.selectCompletion(c.id);

            if (self.state.res) c.deserializeCompletion(JSON.parse(self.state.res));
            // this.setState.res;
          }}
        >
          Load As New Completion
        </Button>

        <Button
          basic
          onClick={ev => {
            this.setState({ res: store.task.data });
          }}
        >
          Task data
        </Button>

        <Button
          basic
          onClick={ev => {
            // this.setState.res;
            const data = JSON.parse(self.state.res);
            const task = {
              id: data["id"],
              project: 2,
              data: JSON.stringify(data),
            };

            store.resetState();
            store.addTask(task);
            store.addGeneratedCompletion(task);
            store.markLoading(false);

            if (store.completionStore.selected)
              store.completionStore.selected.traverseTree(node => node.updateValue && node.updateValue(self));
          }}
        >
          Simulate Loading Task
        </Button>

        <br />
        <br />
        <Form>
          <Form.TextArea
            value={this.state.res}
            className="is-search"
            // label={item.label}
            onChange={ev => {
              this.setState({ res: ev.target.value });
            }}
          />
        </Form>
      </div>
    );
  }
}

export default observer(DebugComponent);
