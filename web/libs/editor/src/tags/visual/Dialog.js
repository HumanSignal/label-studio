import React from 'react';
import { inject, observer } from 'mobx-react';
import { types } from 'mobx-state-tree';
import { Divider, Empty } from 'antd';

import { guidGenerator } from '../../utils/unique';
import Registry from '../../core/Registry';
import DialogView from '../../components/Dialog/Dialog';
import { convertToRGBA, stringToColor } from '../../utils/colors';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';

/**
 * The Dialog tag renders a dialog box on a task with instructions or other content that you define.
 * @example
 * <!--Basic labeling configuration to display a dialog box -->
 * <View>
 *  <Dialog name="dialog" value="$dialog"></Dialog>
 * <View>
 * @param {string} name Name of the element
 * @param {object} value Value of the element
 */
const Replica = types.model({
  name: types.string,
  text: types.string,
  selected: types.optional(types.boolean, false),
  date: types.optional(types.string, ''),
  hint: types.optional(types.string, ''),
});

const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  name: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: 'Dialog',
    data: types.map(Replica),
  });

const DialogModel = types.compose('DialogModel', TagAttrs, Model, AnnotationMixin);

const HtxDialogView = inject('store')(
  observer(({ store, item }) => {
    if (!store.task || !store.task.dataObj) {
      return <Empty />;
    }

    const result = [];
    let name = item.value;

    if (name.charAt(0) === '$') {
      name = name.substr(1);
    }

    store.task.dataObj[name].forEach((item, ind) => {
      let bgColor;

      if (item.name) {
        bgColor = convertToRGBA(stringToColor(item.name), 0.1);
      }

      result.push(
        <DialogView
          key={ind}
          name={item.name}
          hint={item.hint}
          text={item.text}
          selected={item.selected}
          date={item.date}
          id={item.id}
          bg={bgColor}
        />,
      );
    });

    return (
      <div>
        <div
          style={{
            display: 'flex',
            flexFlow: 'column',
            maxHeight: '500px',
            overflowY: 'scroll',
            paddingRight: '10px',
            marginTop: '10px',
          }}
        >
          {result}
        </div>
        <Divider dashed={true} />
      </div>
    );
  }),
);

Registry.addTag('dialog', DialogModel, HtxDialogView);

export { DialogModel, HtxDialogView };
