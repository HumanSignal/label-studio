/**
 * Libraries
 */
import React, { Component } from "react";
import { observer, inject, Provider } from "mobx-react";
import { types, getSnapshot } from "mobx-state-tree";
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
import { HyperTextModel } from "../../interfaces/visual/HyperText";
import { DialogModel } from "../../interfaces/visual/Dialog";

/**
 * Object
 */
import { AudioModel } from "../../interfaces/object/Audio";
import { AudioPlusModel } from "../../interfaces/object/AudioPlus";
import { ImageModel } from "../../interfaces/object/Image";
import { TextModel } from "../../interfaces/object/Text";

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
        return <Result status="success" title="Done!" />;
      }

      renderNoCompletion() {
        return <Result status="success" title="No more completions" />;
      }

      renderNothingToLabel() {
        return <Result status="success" title="No more data available for labeling" />;
      }

      renderLoader() {
        return <Result icon={<Spin size="large" />} />;
      }

      render() {
        const self = this;
        const { store } = self.props;
        let root;

        if (store.completionStore.currentCompletion) {
          root = store.completionStore.currentCompletion.root;
        } else if (store.completionStore.currentPrediction) {
          root = store.completionStore.currentPrediction.root;
        }

        if (store.isLoading) return self.renderLoader();

        if (store.noTask) return self.renderNothingToLabel();

        if (store.labeledSuccess) return self.renderSuccess();

        if (!store.completionStore.currentCompletion && !store.completionStore.currentPrediction) {
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
                  <Segment>
                    {Tree.renderItem(root)}
                    {store.hasInterface("controls") && <Controls />}
                  </Segment>

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
