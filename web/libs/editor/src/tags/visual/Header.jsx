import { types } from "mobx-state-tree";
import { observer } from "mobx-react";

import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import { guidGenerator } from "../../utils/unique";
import { clamp } from "../../utils/utilities";
import "./Header.prefix.css";
import { Typography } from "@humansignal/ui";

/**
 * The `Header` tag is used to show a header on the labeling interface.
 * @example
 * <!-- Display a header on the labeling interface based on a field in the data -->
 * <View>
 *   <Header value="$text" />
 * </View>
 * @example
 * <!-- Display a static header on the labeling interface -->
 * <View>
 *   <Header value="Please select the class" />
 * </View>
 * @name Header
 * @meta_title Header Tag to Show Headers
 * @meta_description Customize Label Studio with the Header tag to display a header for a labeling task for machine learning and data science projects.
 * @param {string} value              - Text of header, either static text or the field name in data to use for the header
 * @param {number} [size=4]           - Level of header on a page, used to control size of the text
 * @param {string} [style]            - CSS style for the header
 * @param {boolean} [underline=false] - Whether to underline the header
 */
const Model = types.model({
  id: types.optional(types.identifier, guidGenerator),
  type: "header",
  size: types.optional(types.string, "4"),
  style: types.maybeNull(types.string),
  _value: types.optional(types.string, ""),
  value: types.optional(types.string, ""),
  underline: types.optional(types.boolean, false),
});

const HeaderModel = types.compose("HeaderModel", Model, ProcessAttrsMixin);

const HtxHeader = observer(({ item }) => {
  const size = clamp(Number.parseInt(item.size), 1, 5);
  const style = item.style ? Tree.cssConverter(item.style) : { margin: "10px 0" };
  const sizeMap = {
    1: { variant: "display", size: "small" },
    2: { variant: "headline", size: "large" },
    3: { variant: "headline", size: "small" },
    4: { variant: "title", size: "large" },
    5: { variant: "title", size: "medium" },
  };

  return (
    <Typography
      variant={sizeMap[size]?.variant || "headline"}
      size={sizeMap[size]?.size || "small"}
      style={style}
      className={item.underline ? "underline" : ""}
    >
      {item._value}
    </Typography>
  );
});

Registry.addTag("header", HeaderModel, HtxHeader);

export { HtxHeader, HeaderModel };
