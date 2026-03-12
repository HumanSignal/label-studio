import { Component } from "react";
import { Badge, Card, List, Popconfirm } from "antd";
import { Button } from "@humansignal/ui";
import { Tooltip } from "@humansignal/ui";
import { observer } from "mobx-react";
import {
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  StarFilled,
  StarOutlined,
  StopOutlined,
  WindowsOutlined,
} from "@ant-design/icons";

import Utils from "../../utils";
import styles from "./Annotations.module.css";

/** @deprecated this file is not used; DraftPanel is moved to separate component */

export const DraftPanel = observer(({ item }) => {
  if (!item.draftSaved && !item.versions.draft) return null;
  const saved = item.draft && item.draftSaved ? ` saved ${Utils.UDate.prettyDate(item.draftSaved)}` : "";

  if (!item.selected) {
    if (!item.draft) return null;
    return <div>draft{saved}</div>;
  }
  if (!item.versions.result || !item.versions.result.length) {
    return <div>{saved ? `draft${saved}` : "not submitted draft"}</div>;
  }
  return (
    <div>
      <Button
        look="string"
        onClick={item.toggleDraft}
        tooltip={item.draftSelected ? "switch to submitted result" : "switch to current draft"}
      >
        {item.draftSelected ? "draft" : "submitted"}
      </Button>
      {saved}
    </div>
  );
});

const Annotation = observer(({ item, store }) => {
  const removeHoney = () => (
    <Button
      size="small"
      tooltip="Unset this result as a ground truth"
      onClick={(ev) => {
        ev.preventDefault();
        item.setGroundTruth(false);
      }}
      aria-label="Unset ground truth"
    >
      <StarOutlined />
    </Button>
  );

  const setHoney = () => {
    const title = item.ground_truth ? "Unset this result as a ground truth" : "Set this result as a ground truth";

    return (
      <Button
        size="small"
        look="string"
        tooltip={title}
        onClick={(ev) => {
          ev.preventDefault();
          item.setGroundTruth(!item.ground_truth);
        }}
        aria-label={item.ground_truth ? "Unset ground truth" : "Set ground truth"}
      >
        {item.ground_truth ? <StarFilled /> : <StarOutlined />}
      </Button>
    );
  };

  const toggleVisibility = (e) => {
    e.preventDefault();
    e.stopPropagation();
    item.toggleVisibility();
    const c = document.getElementById(`c-${item.id}`);

    if (c) c.style.display = item.hidden ? "none" : "unset";
  };

  const highlight = () => {
    const c = document.getElementById(`c-${item.id}`);

    if (c) c.classList.add("hover");
  };

  const unhighlight = () => {
    const c = document.getElementById(`c-${item.id}`);

    if (c) c.classList.remove("hover");
  };

  /**
   * Default badge for saved annotations
   */
  let badge = <Badge status="default" />;

  /**
   *
   */
  let annotationID;

  /**
   * Title of card
   */
  if (item.userGenerate && !item.sentUserGenerate) {
    annotationID = <span className={styles.title}>Unsaved Annotation</span>;
  } else {
    if (item.pk) {
      annotationID = <span className={styles.title}>ID {item.pk}</span>;
    } else if (item.id) {
      annotationID = <span className={styles.title}>ID {item.id}</span>;
    }
  }

  /**
   * Badge for processing of user generate annotation
   */
  if (item.userGenerate) {
    badge = <Badge status="processing" />;
  }

  /**
   * Badge for complete of user generate annotation
   */
  if (item.userGenerate && item.sentUserGenerate) {
    badge = <Badge status="success" />;
  }

  const btnsView = () => {
    const confirm = () => {
      // ev.preventDefault();
      // debugger;
      item.list.deleteAnnotation(item);
    };

    return (
      <div className={styles.buttons}>
        {store.hasInterface("ground-truth") && (item.ground_truth ? removeHoney() : setHoney())}
        &nbsp;
        {store.hasInterface("annotations:delete") && (
          <Tooltip placement="topLeft" title="Delete selected annotation">
            <Popconfirm
              placement="bottomLeft"
              title={"Please confirm you want to delete this annotation"}
              onConfirm={confirm}
              okText="Delete"
              okType="danger"
              cancelText="Cancel"
            >
              <Button size="small" look="string" variant="negative" aria-label="Delete selected annotation">
                <DeleteOutlined />
              </Button>
            </Popconfirm>
          </Tooltip>
        )}
      </div>
    );
  };

  return (
    <List.Item
      key={item.id}
      className={item.selected ? `${styles.annotation} ${styles.annotation_selected}` : styles.annotation}
      onClick={() => {
        !item.selected && store.annotationStore.selectAnnotation(item.id);
      }}
      onMouseEnter={highlight}
      onMouseLeave={unhighlight}
    >
      <div className={styles.annotationcard}>
        <div>
          <div className={styles.title}>
            {badge}
            {annotationID}
          </div>
          {item.pk ? "Created" : "Started"}
          <i>{item.createdAgo ? ` ${item.createdAgo} ago` : ` ${Utils.UDate.prettyDate(item.createdDate)}`}</i>
          {item.createdBy && item.pk ? ` by ${item.createdBy}` : null}
          <DraftPanel item={item} />
        </div>
        {/* platform uses was_cancelled so check both */}
        {store.hasInterface("skip") && (item.skipped || item.was_cancelled) && (
          <Tooltip alignment="top-left" title="Skipped annotation">
            <StopOutlined className={styles.skipped} />
          </Tooltip>
        )}
        {store.annotationStore.viewingAll && (
          <Button
            size="small"
            look="outlined"
            onClick={toggleVisibility}
            aria-label="Toggle visibility of current annotation"
          >
            {item.hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          </Button>
        )}
        {item.selected && btnsView()}
      </div>
    </List.Item>
  );
});

class Annotations extends Component {
  render() {
    const { store } = this.props;

    const title = (
      <div className={`${styles.title} ${styles.titlespace}`}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h3>Annotations</h3>
        </div>

        <div style={{ marginRight: "1px" }}>
          {store.hasInterface("annotations:add-new") && (
            <Button
              size="small"
              tooltip="Create new annotation"
              onClick={(ev) => {
                ev.preventDefault();
                const c = store.annotationStore.createAnnotation();

                store.annotationStore.selectAnnotation(c.id);
              }}
              aria-label="Create new annotation"
            >
              <PlusOutlined />
            </Button>
          )}
          &nbsp;
          <Button
            size="small"
            tooltip="View all annotations"
            look={store.annotationStore.viewingAll ? "filled" : "outlined"}
            onClick={(ev) => {
              ev.preventDefault();
              store.annotationStore.toggleViewingAllAnnotations();
            }}
            aria-label="Toggle view of all annotations"
          >
            <WindowsOutlined />
          </Button>
        </div>
      </div>
    );

    const content = store.annotationStore.annotations.map((c) => <Annotation key={c.id} item={c} store={store} />);

    return (
      <Card title={title} size="small" bodyStyle={{ padding: "0", paddingTop: "1px" }}>
        <List>{store.annotationStore.annotations ? content : <p>No annotations submitted yet</p>}</List>
      </Card>
    );
  }
}

export default observer(Annotations);
