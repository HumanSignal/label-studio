import React from 'react';
import { Tag } from 'antd';
import { inject, observer } from 'mobx-react';
import { getParent, types } from 'mobx-state-tree';

import Hint from '../../components/Hint/Hint';
import ProcessAttrsMixin from '../../mixins/ProcessAttrs';
import Registry from '../../core/Registry';
import { guidGenerator } from '../../core/Helpers';
import { Hotkey } from '../../core/Hotkey';
import { FF_DEV_1564_DEV_1565, FF_DEV_1566, isFF } from '../../utils/feature-flags';
import { customTypes } from '../../core/CustomTypes';
import chroma from 'chroma-js';

/**
 * The `Shortcut` tag to define a shortcut that annotators can use to add a predefined object, such as a specific label value, with a hotkey or keyboard shortcut.
 *
 * Use with the following data types:
 * - Audio
 * - Image
 * - HTML
 * - Paragraphs
 * - Text
 * - Time series
 * - Video
 * @example
 * <!--
 * Basic labeling configuration to add a shortcut that places the text SILENCE in a given Text Area while doing transcription.
 *
 * Note: The default background color for the Shortcut tag is grey color.
 *
 * You can change the background color using text or hexadecimal format in the `background` parameter.
 * -->
 * <View>
 *   <TextArea name="txt-1">
 *     <Shortcut alias="Silence" value="SILENCE" hotkey="ctrl+1" background="#3333333" />
 *   </TextArea>
 * </View>
 * @name Shortcut
 * @meta_title Shortcut Tag to Define Shortcuts
 * @meta_description Customize Label Studio to define keyboard shortcuts and hotkeys to accelerate labeling for machine learning and data science projects.
 * @param {string} value                    - The value of the shortcut
 * @param {string} [alias]                  - Shortcut alias
 * @param {string} [hotkey]                 - Hotkey
 * @param {string} [background=#333333]     - Background color in hexadecimal
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  alias: types.maybeNull(types.string),
  background: types.optional(customTypes.color, '#333333'),
  hotkey: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: 'shortcut',
    _value: types.optional(types.string, ''),
  })
  .volatile(() => ({
    hotkeyScope: Hotkey.INPUT_SCOPE,
  }))
  .actions(self => ({
    onClick() {
      const textarea = getParent(self, 2);

      if (textarea.onShortcut) {
        textarea.onShortcut(self.value);
        if (isFF(FF_DEV_1564_DEV_1565)) {
          textarea.returnFocus?.();
        }
      }
    },

    onHotKey(event) {
      const textarea = getParent(self, 2);
      const name = (event.target || event.srcElement).name;
      // fired on a wrong element

      if (textarea.name !== name && (!isFF(FF_DEV_1566) || !name.startsWith(`${textarea.name}:`))) return;
      if (isFF(FF_DEV_1564_DEV_1565)) {
        event.preventDefault();
      }
      return self.onClick();
    },
  }));

const ShortcutModel = types.compose('ShortcutModel', TagAttrs, Model, ProcessAttrsMixin);

const HtxShortcutView = inject('store')(
  observer(({ item, store }) => {
    const bg = {
      background: chroma(item.background).alpha(0.15),
      color: '#333333',
      cursor: 'pointer',
      margin: '5px',
    };

    return (
      <Tag
        {... (isFF(FF_DEV_1566) ? { 'data-shortcut': true } : {})}
        onClick={(e) => {
          if (isFF(FF_DEV_1564_DEV_1565)) {
            e.preventDefault();
            e.stopPropagation();
          }
          item.onClick();
          return false;
        }}
        style={bg}
      >
        {item.alias ? item.alias : item._value}
        {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && <Hint>[{item.hotkey}]</Hint>}
      </Tag>
    );
  }),
);

Registry.addTag('shortcut', ShortcutModel, HtxShortcutView);

export { HtxShortcutView, ShortcutModel };
