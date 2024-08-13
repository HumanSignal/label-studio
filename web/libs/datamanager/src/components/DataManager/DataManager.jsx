import { inject, observer } from "mobx-react";
import React, { useCallback } from "react";
import { Draggable } from "react-beautiful-dnd";
import { LSPlus } from "../../assets/icons";
import { Block, Elem } from "../../utils/bem";
import { Interface } from "../Common/Interface";
import { Space } from "../Common/Space/Space";
import { Spinner } from "../Common/Spinner";
import { Tabs, TabsItem } from "../Common/Tabs/Tabs";
import { FiltersSidebar } from "../Filters/FiltersSidebar/FilterSidebar";
import { DataView } from "../MainView";
import "./DataManager.scss";
import { Toolbar } from "./Toolbar/Toolbar";

const injector = inject(({ store }) => {
  const { sidebarEnabled, sidebarVisible } = store.viewsStore ?? {};

  return {
    shrinkWidth: sidebarEnabled && sidebarVisible,
  };
});

const summaryInjector = inject(({ store }) => {
  const { project, taskStore } = store;

  return {
    totalTasks: project?.task_count ?? project?.task_number ?? 0,
    totalFoundTasks: taskStore?.total ?? 0,
    totalAnnotations: taskStore?.totalAnnotations ?? 0,
    totalPredictions: taskStore?.totalPredictions ?? 0,
    cloudSync: project.target_syncing ?? project.source_syncing ?? false,
  };
});

const switchInjector = inject(({ store }) => {
  return {
    sdk: store.SDK,
    views: store.viewsStore,
    tabs: Array.from(store.viewsStore?.all ?? []),
    selectedKey: store.viewsStore?.selected?.key,
  };
});

const ProjectSummary = summaryInjector((props) => {
  return (
    <Space size="large" style={{ paddingRight: "1em", color: "rgba(0,0,0,0.3)" }}>
      {props.cloudSync && (
        <Space size="small" style={{ fontSize: 12, fontWeight: 400, opacity: 0.8 }}>
          Storage sync
          <Spinner size="small" />
        </Space>
      )}
      <span style={{ display: "flex", alignItems: "center", fontSize: 12 }}>
        <Space size="compact">
          <span>
            Tasks: {props.totalFoundTasks} / {props.totalTasks}
          </span>
          <span>Annotations: {props.totalAnnotations}</span>
          <span>Predictions: {props.totalPredictions}</span>
        </Space>
      </span>
    </Space>
  );
});

const TabsSwitch = switchInjector(
  observer(({ sdk, views, tabs, selectedKey }) => {
    const editable = sdk.tabControls;

    const onDragEnd = useCallback((result) => {
      if (!result.destination) {
        return;
      }

      views.updateViewOrder(result.source.index, result.destination.index);
    }, []);

    return (
      <Tabs
        activeTab={selectedKey}
        onAdd={() => views.addView({ reload: false })}
        onChange={(key) => views.setSelected(key)}
        onDragEnd={onDragEnd}
        tabBarExtraContent={<ProjectSummary />}
        addIcon={<LSPlus />}
        allowedActions={editable}
      >
        {tabs.map((tab, index) => (
          <Draggable key={tab.key} draggableId={tab.key} index={index}>
            {(provided, snapshot) => (
              <Elem
                name={"draggable"}
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                style={{
                  background: snapshot.isDragging && "#ddd",
                  ...provided.draggableProps.style,
                }}
              >
                <TabsItem
                  key={tab.key}
                  tab={tab.key}
                  title={tab.title}
                  onFinishEditing={(title) => {
                    tab.setTitle(title);
                    tab.save();
                  }}
                  onDuplicate={() => views.duplicateView(tab)}
                  onClose={() => views.deleteView(tab)}
                  onSave={() => tab.virtual && tab.saveVirtual()}
                  active={tab.key === selectedKey}
                  editable={tab.editable}
                  deletable={tab.deletable}
                  virtual={tab.virtual}
                />
              </Elem>
            )}
          </Draggable>
        ))}
      </Tabs>
    );
  }),
);

export const DataManager = injector(({ shrinkWidth }) => {
  return (
    <Block name="tabs-dm-content">
      <Elem name="tab" mod={{ shrink: shrinkWidth }}>
        <Interface name="tabs">
          <TabsSwitch />
        </Interface>

        <Interface name="toolbar">
          <Toolbar />
        </Interface>

        <DataView />
      </Elem>
      <FiltersSidebar />
    </Block>
  );
});
