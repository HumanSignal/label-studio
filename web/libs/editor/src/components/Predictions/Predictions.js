import React, { Component } from 'react';
import { Button, Card, List, Tooltip } from 'antd';
import { observer } from 'mobx-react';

import { CopyOutlined, EyeInvisibleOutlined, EyeOutlined, WindowsOutlined } from '@ant-design/icons';

import Utils from '../../utils';
import styles from '../Annotations/Annotations.module.scss';

const Prediction = observer(({ item, store }) => {
  const toggleVisibility = e => {
    e.preventDefault();
    e.stopPropagation();
    item.toggleVisibility();
    const c = document.getElementById(`c-${item.id}`);

    if (c) c.style.display = item.hidden ? 'none' : 'unset';
  };

  const highlight = () => {
    const c = document.getElementById(`c-${item.id}`);

    if (c) c.classList.add('hover');
  };

  const unhighlight = () => {
    const c = document.getElementById(`c-${item.id}`);

    if (c) c.classList.remove('hover');
  };

  return (
    <List.Item
      key={item.id}
      className={item.selected ? `${styles.annotation} ${styles.annotation_selected}` : styles.annotation}
      onClick={() => {
        !item.selected && store.annotationStore.selectPrediction(item.id);
      }}
      onMouseEnter={highlight}
      onMouseLeave={unhighlight}
    >
      <div className={styles.itembtns}>
        <div>
          <div className={styles.title}>{item.createdBy ? `Model (${item.createdBy})` : null}</div>
          Created
          <i>{item.createdAgo ? ` ${item.createdAgo} ago` : ` ${Utils.UDate.prettyDate(item.createdDate)}`}</i>
        </div>
        <div className={styles.buttons}>
          {item.selected && (
            <Tooltip placement="topLeft" title="Add a new annotation based on this prediction">
              <Button
                size="small"
                onClick={ev => {
                  ev.preventDefault();

                  const cs = store.annotationStore;
                  const p = cs.selected;
                  const c = cs.addAnnotationFromPrediction(p);

                  // this is here because otherwise React doesn't re-render the change in the tree
                  window.setTimeout(function() {
                    store.annotationStore.selectAnnotation(c.id);
                  }, 50);
                }}
              >
                <CopyOutlined />
              </Button>
            </Tooltip>
          )}
          {store.annotationStore.viewingAllAnnotations && (
            <Button size="small" type="primary" ghost onClick={toggleVisibility}>
              {item.hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </Button>
          )}
        </div>
      </div>
    </List.Item>
  );
});

class Predictions extends Component {
  render() {
    const { store } = this.props;
    const { predictions } = store.annotationStore;

    const title = (
      <div className={styles.title + ' ' + styles.titlespace}>
        <h3>Predictions</h3>
        {/* @todo fix View All mode */}
        {store.annotationStore.predictions.length > 0 && false && (
          <Tooltip placement="topLeft" title="View all predictions">
            <Button
              size="small"
              type={store.annotationStore.viewingAllPredictions ? 'primary' : ''}
              onClick={ev => {
                ev.preventDefault();
                store.annotationStore.toggleViewingAllPredictions();
              }}
            >
              <WindowsOutlined />
            </Button>
          </Tooltip>
        )}
      </div>
    );

    return (
      <Card title={title} size="small" bodyStyle={{ padding: '0' }}>
        <List>
          {predictions && predictions.length ? (
            predictions.map(p => <Prediction key={p.id} item={p} store={store} />)
          ) : (
            <List.Item>
              <div style={{ padding: '0 12px' }}>No predictions</div>
            </List.Item>
          )}
        </List>
      </Card>
    );
  }
}

export default observer(Predictions);
