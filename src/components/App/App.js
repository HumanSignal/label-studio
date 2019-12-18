/**
 * Libraries
 */
import React, { Component } from "react";
import { observer, inject, Provider } from "mobx-react";
import { types, getSnapshot, getEnv } from "mobx-state-tree";
import { Result, Spin } from "antd";

/**
 * Core
 */
import Registry from "../../core/Registry";
import Requests from "../../core/Requests";
import { guidGenerator } from "../../core/Helpers";
import Tree from "../../core/Tree";

/**
 * Components
 */
import Completions from "../Completions/Completions";
import Predictions from "../Predictions/Predictions";
import Controls from "../Controls/Controls";
import Panel from "../Panel/Panel";
import Settings from "../Settings/Settings";
import Debug from "../Debug";
import SideColumn from "../SideColumn/SideColumn";
import Segment from "../Segment/Segment";

/**
 * Visual
 */
import { ViewModel } from "../../interfaces/visual/View";
import { TableModel } from "../../interfaces/visual/Table";
import { HeaderModel } from "../../interfaces/visual/Header";
import { DialogModel } from "../../interfaces/visual/Dialog";

/**
 * Object
 */
import { AudioModel } from "../../interfaces/object/Audio";
import { AudioPlusModel } from "../../interfaces/object/AudioPlus";
import { ImageModel } from "../../interfaces/object/Image";
import { TextModel } from "../../interfaces/object/Text";
import { HyperTextModel } from "../../interfaces/object/HyperText";

/**
 * Control
 */
import { RectangleModel } from "../../interfaces/control/Rectangle";
import { KeyPointModel } from "../../interfaces/control/KeyPoint";
import { KeyPointLabelsModel } from "../../interfaces/control/KeyPointLabels";
import { PolygonModel } from "../../interfaces/control/Polygon";
import { RectangleLabelsModel } from "../../interfaces/control/RectangleLabels";
import { PolygonLabelsModel } from "../../interfaces/control/PolygonLabels";
import { ChoicesModel } from "../../interfaces/control/Choices";
import { PairwiseModel } from "../../interfaces/control/Pairwise";

import { RatingModel } from "../../interfaces/control/Rating";
import { ListModel } from "../../interfaces/control/List";
import { RankerModel } from "../../interfaces/control/Ranker";
import { ShortcutModel } from "../../interfaces/control/Shortcut";
import { TextAreaModel } from "../../interfaces/control/TextArea";

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
        const { store } = this.props;

        if (obj.length == 1) return <Segment>{Tree.renderItem(obj[0].root)}</Segment>;

        return (
          <div className="renderall">
            {obj.map(c => (
              <div className="fade">
                <Segment>{Tree.renderItem(c.root)}</Segment>
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
        let root;

        if (cs.currentCompletion) {
          root = cs.currentCompletion.root;
        } else if (cs.currentPrediction) {
          root = cs.currentPrediction.root;
        }

        if (store.isLoading) return self.renderLoader();

        if (store.noTask) return self.renderNothingToLabel();

        if (store.noAccess) return self.renderNoAccess();

        if (store.labeledSuccess) return self.renderSuccess();

        if (!cs.currentCompletion && !cs.currentPrediction) {
          return self.renderNoCompletion();
        }

        return (
          <div className={styles.editor}>
            <Settings store={store} />
            <Provider store={store}>
              <div>
                {store.hasInterface("panel") && <Panel store={store} />}

                {store.showingDescription && (
                  <Segment>
                    <div dangerouslySetInnerHTML={{ __html: store.description }} />
                  </Segment>
                )}

                <div className={styles.common}>
                  {!cs.viewingAllCompletions && !cs.viewingAllPredictions && (
                    <Segment>
                      {Tree.renderItem(root)}
                      {store.hasInterface("controls") && <Controls />}
                    </Segment>
                  )}
                  {cs.viewingAllCompletions && this.renderAllCompletions()}
                  {cs.viewingAllPredictions && this.renderAllPredictions()}

                  <div className={styles.menu}>
                    {store.hasInterface("completions:menu") && <Completions store={store} />}

                    {store.hasInterface("predictions:menu") && <Predictions store={store} />}

                    {store.hasInterface("side-column") && <SideColumn store={store} />}
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
