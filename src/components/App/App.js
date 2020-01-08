/**
 * Libraries
 */
import React, { Component } from "react";
import { Result, Spin } from "antd";
import { getEnv } from "mobx-state-tree";
import { observer, inject, Provider } from "mobx-react";

/**
 * Core
 */
import Tree from "../../core/Tree";

/**
 * Components
 */
import Completions from "../Completions/Completions";
import Controls from "../Controls/Controls";
import Debug from "../Debug";
import Panel from "../Panel/Panel";
import Predictions from "../Predictions/Predictions";
import Segment from "../Segment/Segment";
import Settings from "../Settings/Settings";
import SideColumn from "../SideColumn/SideColumn";

/**
 * Tags
 */
import * as ObjectTags from "../../tags/object";
import * as ControlTags from "../../tags/control";
import * as VisualTags from "../../tags/visual";

/**
 * Styles
 */
import styles from "./App.module.scss";

/**
 * App
 */
const App = inject("store")(
  observer(
    class App extends Component {
      renderSuccess() {
        return <Result status="success" title={getEnv(this.props.store).messages.DONE} />;
      }

      renderNoCompletion() {
        return <Result status="success" title={getEnv(this.props.store).messages.NO_COMP_LEFT} />;
      }

      renderNothingToLabel() {
        return <Result status="success" title={getEnv(this.props.store).messages.NO_NEXT_TASK} />;
      }

      renderNoAccess() {
        return <Result status="warning" title={getEnv(this.props.store).messages.NO_ACCESS} />;
      }

      renderLoader() {
        return <Result icon={<Spin size="large" />} />;
      }

      _renderAll(obj) {
        if (obj.length === 1) return <Segment>{[Tree.renderItem(obj[0].root)]}</Segment>;

        return (
          <div className="ls-renderall">
            {obj.map(c => (
              <div className="ls-fade">
                <Segment>{[Tree.renderItem(c.root)]}</Segment>
              </div>
            ))}
          </div>
        );
      }

      renderAllCompletions() {
        return this._renderAll(this.props.store.completionStore.completions);
      }

      renderAllPredictions() {
        return this._renderAll(this.props.store.completionStore.predictions);
      }

      render() {
        const self = this;
        const { store } = self.props;
        const cs = store.completionStore;
        const root = cs.selected && cs.selected.root;

        if (store.isLoading) return self.renderLoader();

        if (store.noTask) return self.renderNothingToLabel();

        if (store.noAccess) return self.renderNoAccess();

        if (store.labeledSuccess) return self.renderSuccess();

        if (!root) return self.renderNoCompletion();

        return (
          <div className={styles.editor + " ls-editor"}>
            <Settings store={store} />
            <Provider store={store}>
              <div>
                {store.hasInterface("panel") && <Panel store={store} />}

                {store.showingDescription && (
                  <Segment>
                    <div dangerouslySetInnerHTML={{ __html: store.description }} />
                  </Segment>
                )}

                <div className={styles.common + " ls-common"}>
                  {!cs.viewingAllCompletions && !cs.viewingAllPredictions && (
                    <Segment className="ls-segment">
                      {Tree.renderItem(root)}
                      {store.hasInterface("controls") && <Controls item={cs.selected} />}
                    </Segment>
                  )}
                  {cs.viewingAllCompletions && this.renderAllCompletions()}
                  {cs.viewingAllPredictions && this.renderAllPredictions()}

                  <div className={styles.menu + " ls-menu"}>
                    {store.hasInterface("completions:menu") && <Completions store={store} />}
                    {store.hasInterface("predictions:menu") && <Predictions store={store} />}
                    {store.hasInterface("side-column") && !cs.viewingAllCompletions && !cs.viewingAllPredictions && (
                      <SideColumn store={store} />
                    )}
                  </div>
                </div>
              </div>
            </Provider>
            {store.hasInterface("debug") && <Debug store={store} />}
          </div>
        );
      }
    },
  ),
);

export default App;
