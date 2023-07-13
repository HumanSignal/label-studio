import { Spin, Tree } from 'antd';
import { observer } from 'mobx-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Entities.module.scss';
import Utils from '../../utils';

import { LsChevron } from '../../assets/icons';
import { RegionItem } from './RegionItem';

export const RegionTree = observer(({ regionStore }) => {
  // @todo improve list render
  // this whole block performs async render to not block the rest of UI on first render
  const [deferred, setDeferred] = useState(true);
  const renderNow = useCallback(() => setDeferred(false), []);

  useEffect(() => {
    setTimeout(renderNow);
  }, [renderNow]);

  const canDrag = useRef(true);
  const setDraggable = useCallback((isDraggable)=>{
    canDrag.current = isDraggable;
  }, []);

  if (deferred)
    return (
      <div style={{ textAlign: 'center' }}>
        <Spin />
      </div>
    );

  const isFlat = !regionStore.sortedRegions.some(r => r.parentID);
  const regions = regionStore.asTree((item, idx, onClick) => {
    return {
      key: item.id,
      title: <RegionItem item={item} idx={idx} flat={isFlat} setDraggable={setDraggable} onClick={onClick}/>,
    };
  });

  const classifications = regionStore.classifications.map(item => ({
    classification: true,
    key: item.id,
    title: <RegionItem item={item} flat  setDraggable={setDraggable} />,
  }));

  const treeData = [...classifications, ...regions];

  return (
    <Tree
      className={styles.treelabels}
      treeData={treeData}
      draggable={true}
      showIcon={false}
      blockNode={true}
      defaultExpandAll={true}
      autoExpandParent={true}
      switcherIcon={<LsChevron opacity="0.25"/>}
      onDragStart={({ event, node }) => {
        if (node.classification || !canDrag.current) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      }}
      onDrop={({ node, dragNode, dropPosition, dropToGap }) => {
        if (node.classification) return false;
        const dropKey = node.props.eventKey;
        const dragKey = dragNode.props.eventKey;
        const dropPos = node.props.pos.split('-');

        dropPosition = dropPosition - parseInt(dropPos[dropPos.length - 1]);
        const treeDepth = dropPos.length;

        const dropReg = regionStore.findRegionID(dropKey);
        const dragReg = regionStore.findRegionID(dragKey);

        regionStore.unhighlightAll();

        if (treeDepth === 2 && dropToGap && dropPosition === -1) {
          dragReg.setParentID('');
        } else if (dropPosition !== -1) {
          // check if the dragReg can be a child of dropReg
          const selDrop = dropReg.labeling?.selectedLabels || [];
          const labelWithConstraint = selDrop.filter(l => l.groupcancontain);

          if (labelWithConstraint.length) {
            const selDrag = dragReg.labeling.selectedLabels;

            const set1 = Utils.Checkers.flatten(labelWithConstraint.map(l => l.groupcancontain.split(',')));
            const set2 = Utils.Checkers.flatten(selDrag.map(l => (l.alias ? [l.alias, l.value] : [l.value])));

            if (set1.filter(value => -1 !== set2.indexOf(value)).length === 0) return;
          }

          // check drop regions tree depth
          if (dropReg.labeling?.from_name?.groupdepth) {
            let maxDepth = Number(dropReg.labeling.from_name.groupdepth);

            // find the height of the tree formed by dragReg for
            // example if we have a tree of A -> B -> C -> D and
            // we're moving B -> C part somewhere then it'd have a
            // height of 1
            const treeHeight = function(node) {
              if (!node) return 0;

              // TODO this can blow up if we have lots of stuff there
              const childrenHeight = regionStore.filterByParentID(node.pid).map(c => treeHeight(c));

              if (!childrenHeight.length) return 0;

              return 1 + Math.max.apply(Math, childrenHeight);
            };

            if (maxDepth >= 0) {
              maxDepth = maxDepth - treeHeight(dragReg);
              let reg = dropReg;

              while (reg) {
                reg = regionStore.findRegion(reg.parentID);
                maxDepth = maxDepth - 1;
              }

              if (maxDepth < 0) return;
            }
          }

          dragReg.setParentID(dropReg.id);
        }
      }}
    >
      {/* <TreeNode title="hello" key="0-0" style={{ width: '100%' }} /> */}
    </Tree>
  );
});
