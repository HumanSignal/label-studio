/**
 * Libraries
 */
import React, { Component } from "react";
import { Result, Spin } from "antd";
import { getEnv, getRoot } from "mobx-state-tree";
import { observer, Provider } from "mobx-react";

/**
 * Core
 */
import { CommentsOverlay } from "../InteractiveOverlays/CommentsOverlay";
import { TreeValidation } from "../TreeValidation/TreeValidation";

/**
 * Tags
 */
import "../../tags/object";
import "../../tags/control";
import "../../tags/visual";
import "../../tags/Custom";

/**
 * Utils and common components
 */
import { Space } from "../../common/Space/Space";
import { Button } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import { isSelfServe } from "../../utils/billing";
import { FF_BULK_ANNOTATION, FF_DEV_3873, FF_LSDV_4620_3_ML, FF_SIMPLE_INIT, isFF } from "../../utils/feature-flags";
import { sanitizeHtml } from "../../utils/html";
import { reactCleaner } from "../../utils/reactCleaner";
import { guidGenerator } from "../../utils/unique";
import { isDefined, sortAnnotations } from "../../utils/utilities";
import { ToastProvider, ToastViewport } from "@humansignal/ui/lib/toast/toast";

/**
 * Components
 */
import { Annotation } from "./Annotation";
import { BottomBar } from "../BottomBar/BottomBar";
import Debug from "../Debug";
import { InstructionsModal } from "../InstructionsModal/InstructionsModal";
import { RelationsOverlay } from "../InteractiveOverlays/RelationsOverlay";
import Settings from "../Settings/Settings";
import { SidePanels } from "../SidePanels/SidePanels";
import { SideTabsPanels } from "../SidePanels/TabPanels/SideTabsPanels";
import { TopBar } from "../TopBar/TopBar";
import { ViewAll } from "./ViewAll";

/**
 * Styles
 */
import "./App.scss";

/**
 * App
 */
class App extends Component {
  relationsRef = React.createRef();

  componentDidMount() {
    // Hack to activate app hotkeys
    window.blur();
    document.body.focus();
  }

  renderSuccess() {
    return (
      <div className={cn("editor").toClassName()}>
        <Result status="success" title={getEnv(this.props.store).messages.DONE} />
      </div>
    );
  }

  renderNoAnnotation() {
    return (
      <div className={cn("editor").toClassName()}>
        <Result status="success" title={getEnv(this.props.store).messages.NO_COMP_LEFT} />
      </div>
    );
  }

  renderNothingToLabel(store) {
    return (
      <div
        className={cn("editor").toClassName()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          paddingBottom: "30vh",
        }}
      >
        <Result status="success" title={getEnv(this.props.store).messages.NO_NEXT_TASK} />
        <div className={cn("sub__result").toClassName()}>All tasks in the queue have been completed</div>
        {store.taskHistory.length > 0 && (
          <Button
            onClick={(e) => store.prevTask(e, true)}
            variant="neutral"
            className="mx-0 my-4"
            aria-label="Previous task"
          >
            Go to Previous Task
          </Button>
        )}
      </div>
    );
  }

  renderNoAccess() {
    return (
      <div className={cn("editor").toClassName()}>
        <Result status="warning" title={getEnv(this.props.store).messages.NO_ACCESS} />
      </div>
    );
  }

  renderConfigValidationException(store) {
    return (
      <div className={cn("main-view").toClassName()}>
        <div className={cn("main-view").elem("annotation").toClassName()}>
          <TreeValidation errors={this.props.store.annotationStore.validation} />
        </div>
        {!isFF(FF_DEV_3873) && store.hasInterface("infobar") && (
          <div className={cn("main-view").elem("infobar").toClassName()}>Task #{store.task.id}</div>
        )}
      </div>
    );
  }

  renderLoader() {
    return <Result icon={<Spin size="large" />} />;
  }

  _renderUI(root, as) {
    if (as.viewingAll && getRoot(as).hasInterface("annotations:view-all")) {
      return this.renderAllAnnotations();
    }

    return (
      <div
        key={(as.selectedHistory ?? as.selected)?.id}
        className={cn("main-view").toClassName()}
        onScrollCapture={this._notifyScroll}
      >
        <div className={cn("main-view").elem("annotation").toClassName()}>
          {<Annotation root={root} annotation={as.selected} />}
          {this.renderRelations(as.selected)}
          {this.renderCommentsOverlay(as.selected)}
        </div>
        {!isFF(FF_DEV_3873) && getRoot(as).hasInterface("infobar") && this._renderInfobar(as)}
      </div>
    );
  }

  _renderInfobar(as) {
    const { id, queue } = getRoot(as).task;

    return (
      <Space className={cn("main-view").elem("infobar").toClassName()} size="small">
        <span>Task #{id}</span>

        {queue && <span>{queue}</span>}
      </Space>
    );
  }

  renderAllAnnotations() {
    const as = this.props.store.annotationStore;
    const entities = [...as.annotations, ...as.predictions];

    if (isFF(FF_SIMPLE_INIT)) {
      // the same sorting we have in AnnotationsCarousel, so we'll see the same order in both places
      sortAnnotations(entities);
    }

    return <ViewAll store={as} annotations={entities} root={as.root} />;
  }

  renderRelations(selectedStore) {
    const store = selectedStore.relationStore;
    const taskData = this.props.store.task?.data;

    return (
      <RelationsOverlay
        key={guidGenerator()}
        store={store}
        ref={this.relationsRef}
        tags={selectedStore.names}
        taskData={taskData}
      />
    );
  }

  renderCommentsOverlay(selectedAnnotation) {
    const { store } = this.props;
    const { commentStore } = store;

    if (!store.hasInterface("annotations:comments") || !commentStore.isCommentable) return null;
    return <CommentsOverlay commentStore={commentStore} annotation={selectedAnnotation} />;
  }

  render() {
    const { store } = this.props;
    const as = store.annotationStore;
    const root = as.selected && as.selected.root;
    const { settings } = store;

    if (store.isLoading) return this.renderLoader();

    if (store.noTask) return this.renderNothingToLabel(store);

    if (store.noAccess) return this.renderNoAccess();

    if (store.labeledSuccess) return this.renderSuccess();

    if (!root) return this.renderNoAnnotation();

    const viewingAll = as.viewingAll;

    // tags can be styled in config when user is awaiting for suggestions from ML backend
    const mainContent = (
      <div
        className={cn("main-content")
          .mix(...(store.awaitingSuggestions ? ["requesting"] : []))
          .toClassName()}
      >
        {as.validation === null
          ? this._renderUI(as.selectedHistory?.root ?? root, as)
          : this.renderConfigValidationException(store)}
      </div>
    );

    const isBulkMode = isFF(FF_BULK_ANNOTATION) && !isSelfServe() && store.hasInterface("annotation:bulk");
    const newUIEnabled = isFF(FF_DEV_3873);

    return (
      <div
        className={cn("editor").mod({ fullscreen: settings.fullscreen }).toClassName()}
        ref={isFF(FF_LSDV_4620_3_ML) ? reactCleaner(this) : null}
      >
        <Settings store={store} />
        <Provider store={store}>
          <ToastProvider>
            {newUIEnabled ? (
              <InstructionsModal
                visible={store.showingDescription}
                onCancel={() => store.toggleDescription()}
                title={store.hasInterface("review") ? "Review Instructions" : "Labeling Instructions"}
              >
                {store.description}
              </InstructionsModal>
            ) : (
              <>
                {store.showingDescription && (
                  <div className="p-base mb-base">
                    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: we need html here and it's sanitized */}
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(store.description) }} />
                  </div>
                )}
              </>
            )}

            {isDefined(store) && store.hasInterface("topbar") && <TopBar store={store} />}
            <div
              className={cn("wrapper")
                .mod({
                  viewAll: viewingAll,
                  bsp: settings.effectiveBottomSidePanel,
                  showingBottomBar: newUIEnabled,
                })
                .toClassName()}
            >
              {newUIEnabled ? (
                isBulkMode || !store.hasInterface("side-column") ? (
                  <>
                    {mainContent}
                    {store.hasInterface("topbar") && <BottomBar store={store} />}
                  </>
                ) : (
                  <SideTabsPanels
                    panelsHidden={viewingAll}
                    currentEntity={as.selectedHistory ?? as.selected}
                    regions={as.selected.regionStore}
                    showComments={store.hasInterface("annotations:comments")}
                    focusTab={store.commentStore.tooltipMessage ? "comments" : null}
                  >
                    {mainContent}
                    {store.hasInterface("topbar") && <BottomBar store={store} />}
                  </SideTabsPanels>
                )
              ) : isBulkMode || !store.hasInterface("side-column") ? (
                mainContent
              ) : (
                <SidePanels
                  panelsHidden={viewingAll}
                  currentEntity={as.selectedHistory ?? as.selected}
                  regions={as.selected.regionStore}
                >
                  {mainContent}
                </SidePanels>
              )}
            </div>
            <ToastViewport />
          </ToastProvider>
        </Provider>
        {store.hasInterface("debug") && <Debug store={store} />}
      </div>
    );
  }

  _notifyScroll = () => {
    if (this.relationsRef.current) {
      this.relationsRef.current.onResize();
    }
  };
}

export default observer(App);
