import React, { Component } from 'react';
import { Button, Spin } from 'antd';
import { LeftCircleOutlined, RightCircleOutlined } from '@ant-design/icons';
import styles from './Grid.module.scss';
import { EntityTab } from '../AnnotationTabs/AnnotationTabs';
import { observe } from 'mobx';
import Konva from 'konva';
import { Annotation } from './Annotation';
import { isDefined } from '../../utils/utilities';
import { FF_DEV_3391, isFF } from '../../utils/feature-flags';
import { moveStylesBetweenHeadTags } from '../../utils/html';

/***** DON'T TRY THIS AT HOME *****/
/*
Grid renders a container which remains untouched all the process.
On every rerender it renders Item with next annotation in the list.
Rendered annotation is cloned into the container. And index of "current" annotation increases.
This triggers next rerender with next annotation until all the annotations are rendered.
*/

class Item extends Component {
  componentDidMount() {
    Promise.all(this.props.annotation.objects.map(o => {
      return o.isReady
        ? Promise.resolve(o.isReady)
        : new Promise(resolve => {
          const dispose = observe(o, 'isReady', ()=>{
            dispose();
            resolve();
          });
        });
    })).then(()=>{
      // ~2 ticks for canvas to be rendered and resized completely
      setTimeout(this.props.onFinish, 32);
    });
  }

  render() {
    return <Annotation root={this.props.root} annotation={this.props.annotation} />;
  }
}

export default class Grid extends Component {
  state = {
    item: 0,
    loaded: new Set(),
  };
  container = React.createRef();

  shouldComponentUpdate(nextProps, nexState) {
    return !nextProps.store.selected.selected || nexState.item >= nextProps.annotations.length || nextProps.annotations[nexState.item] === nextProps.store.selected;
  }

  componentDidMount() {
    if (!isFF(FF_DEV_3391) && this.props.annotations[0] !== this.props.store.selected) {
      this.startRenderCycle();
    }
  }

  startRenderCycle() {
    this.renderNext(0);
  }

  renderNext(idx) {
    this.setState(
      { item: isDefined(idx) ? idx : this.state.item + 1 },
      () => {
        if (this.state.item < this.props.annotations.length) {
          this.props.store._selectItem(this.props.annotations[this.state.item]);
        } else {
          this.props.store._unselectAll();
        }
      });
  }

  onFinish = () => {
    const c = this.container.current;

    if (!c) return;

    const itemWrapper = c.children[c.children.length - 1];
    const item = itemWrapper.children[itemWrapper.children.length - 1];
    const clone = item.cloneNode(true);

    c.children[this.state.item].appendChild(clone);

    // Force redraw
    Konva.stages.map(stage => stage.draw());

    /* canvases are cloned empty, so clone their content */
    const sourceCanvas = item.querySelectorAll('canvas');
    const clonedCanvas = clone.querySelectorAll('canvas');

    clonedCanvas.forEach((canvas, i) => {
      canvas.getContext('2d').drawImage(sourceCanvas[i], 0, 0);
    });

    /*
      Procedure created style rules are not clonable so for
      iframe we should take care about them (highlight styles)
    */
    const sourceIframe = item.querySelectorAll('iframe');
    const clonedIframe = clone.querySelectorAll('iframe');

    clonedIframe.forEach((iframe, idx) => {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(sourceIframe[idx].contentDocument.documentElement.outerHTML);
      moveStylesBetweenHeadTags(sourceIframe[idx].contentDocument.head, iframe.contentDocument.head);
    });

    this.setState((state) => {
      return {
        ...state,
        loaded: new Set([...state.loaded, this.props.store.selected.id]),
      };
    });

    this.renderNext();
  };

  shift = delta => {
    const container = this.container.current;
    const children = container.children;

    const current = Array.from(children).findIndex(child => container.scrollLeft <= child.offsetLeft);

    if (!container) return;
    
    const count = this.props.annotations.length;
    const next = current + delta; 
    
    if (next < 0 || next > count - 1) return;
    const newPosition = children[next].offsetLeft;

    container.scrollTo({ left: newPosition, top: 0, behavior: 'smooth' });
  };

  left = () => {
    this.shift(-1);
  };

  right = () => {
    this.shift(1);
  };

  select = c => {
    const { store } = this.props;

    c.type === 'annotation' ? store.selectAnnotation(c.id) : store.selectPrediction(c.id);
  };


  render() {
    const i = this.state.item;
    const { annotations } = this.props;
    const selected = isFF(FF_DEV_3391) ? null : this.props.store.selected;
    const isRenderingNext = i < annotations.length && annotations[i] === selected;

    return (
      <div className={styles.container}>
        <div ref={this.container} className={styles.grid}>
          {annotations.filter(c => !c.hidden).map((c) => (
            <div id={`c-${c.id}`} key={`anno-${c.id}`} style={{ position: 'relative' }}>
              <EntityTab
                entity={c}
                onClick={() => this.select(c)}
                prediction={c.type === 'prediction'}
                bordered={false}
                style={{ height: 44 }}
              />
              {isFF(FF_DEV_3391)
                ? <Annotation root={this.props.root} annotation={c} />
                : !this.state.loaded.has(c.id) && (
                  <div style={{
                    top: 0,
                    left: 0,
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Spin size="large" />
                  </div>
                )
              }
            </div>
          ))}
          {isRenderingNext && (
            <div id={'c-tmp'} key={'anno-tmp'} style={{ opacity: 0, position: 'relative', right: 99999 }}>
              <EntityTab
                entity={selected}
                prediction={selected.type === 'prediction'}
                bordered={false}
                style={{ height: 44 }}
              />
              <Item root={this.props.root} onFinish={this.onFinish} key={i} annotation={selected} />
            </div>
          )}
        </div>
        <Button type="text" onClick={this.left} className={styles.left} icon={<LeftCircleOutlined />} />
        <Button type="text" onClick={this.right} className={styles.right} icon={<RightCircleOutlined />} />
      </div>
    );
  }
}
