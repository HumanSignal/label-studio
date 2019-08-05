/**
 * Libraries
 */
import React, { Component } from "react";
import parse5 from "parse5";
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
import Controls from "../Controls/Controls";
import Panel from "../Panel/Panel";
import Settings from "../Settings/Settings";
import Debug from "../Debug";
import SideColumn from "../SideColumn/SideColumn";

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
import { PolygonModel } from "../../interfaces/control/Polygon";
import { RectangleLabelsModel } from "../../interfaces/control/RectangleLabels";
import { PolygonLabelsModel } from "../../interfaces/control/PolygonLabels";
import { ChoicesModel } from "../../interfaces/control/Choices";
import { TextAreaModel } from "../../interfaces/control/TextArea";
import { RatingModel } from "../../interfaces/control/Rating";
import { ListModel } from "../../interfaces/control/List";
import { RankerModel } from "../../interfaces/control/Ranker";

/**
 * Components
 */
import Segment from "../Segment/Segment";

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
        const { store } = this.props;

        return <Result status="success" title="Done!" />;
      }

      renderNoCompletion() {
        const { store } = this.props;

        return <Result status="success" title="No more completions" />;
      }

      renderNothingToLabel() {
        const { store } = this.props;

        return <Result status="success" title="No more data available for labeling" />;
      }

      renderLoader() {
        return <Result icon={<Spin size="large" />} />;
      }

      render() {
        const self = this;
        const { store } = this.props;

        if (store.isLoading) return this.renderLoader();

        if (store.noTask) return this.renderNothingToLabel();

        if (store.labeledSuccess) return this.renderSuccess();

        if (!store.completionStore.currentCompletion) return this.renderNoCompletion();

        const { root } = store.completionStore.currentCompletion;

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

                <div className={"common-container"}>
                  <Segment>
                    {Tree.renderItem(root)}
                    {store.hasInterface("submit") && <Controls />}
                  </Segment>

                  <div className={styles.menu}>
                    {store.hasInterface("completions") && <Completions store={store} />}

                    {store.hasInterface("side-column") && <SideColumn store={store} />}
                  </div>
                </div>
              </div>
            </Provider>
          </div>
        );
      }
    },
  ),
);

export default App;
