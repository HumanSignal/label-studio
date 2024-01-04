// this is just a virtual tag, expanded directly in Tree.tsx during config parsing

/**
 * Repeater Tag for annotating multiple data objects in a dynamic range with the same semantics. You can loop through data items in a python-like `for` cycle in the labeling process.
 * It repeats tags inside it for every item in a given data array from your dataset. All the occurrences of `indexFlag` (default is `{{idx}}`) in parameter values will be replaced by the current index.
 * Names should always be unique, so you can use this placeholder in tag names.
 *
 * The Repeater Tag supports the `mode` property. This creates the possibility to enable pagination in repeater for performance improvement.
 * You can add a parameter `<Repeater mode="pagination" ...>`  to show only one page at a time, shrinking memory used to one tag set.
 * @example
 * <!-- How tags are repeated and placeholders are replaced internally. -->
 * <!-- original config -->
 * <View>
 *   <Repeater on="$images">
 *     <Image name="image_{{idx}}" value="$images[{{idx}}]"/>
 *   </Repeater>
 * </View>
 * <!-- data -->
 * {
 *   "images": [ "s3://images/01.jpg", "s3://images/02.jpg" ]
 * }
 * <!-- resulting config -->
 * <View>
 *   <Image name="image_0" value="$images[0]"/>
 *   <Image name="image_1" value="$images[1]"/>
 * </View>
 * @example
 * <!-- Real world application. -->
 * <View>
 *   <Repeater on="$utterances" indexFlag="{{idx}}" mode="pagination">
 *     <Text name="user_{{idx}}" value="$utterances[{{idx}}].text"/>
 *     <Header value="Utterance Review"/>
 *     <Choices name="utterance_action_{{idx}}" showInline="true" toName="user_{{idx}}">
 *       <Choice value="No Action"/>
 *       <Choice value="Training"/>
 *       <Choice value="New Intent"/>
 *     </Choices>
 *   </Repeater>
 * </View>
 * <!-- data -->
 * {
 *   "utterances": [
 *     { "text": "Data field object with array with similar data" },
 *     { "text": "Placeholder for array index in params of underlying tags" }
 *   ]
 * }
 * @todo Tag will be deprecated, currently it's removed from docs; don't add @name
 * @meta_title Repeater Tag to duplicate annotation settings
 * @meta_description Customize Label Studio with the Repeater tag to repeat similar data blocks to accelerate labeling for machine learning and data science projects.
 * @param {string} on                  - Data field object with array with similar data
 * @param {string} [indexFlag={{idx}}] - Placeholder for array index in params of underlying tags
 * @param {list|pagination} [mode]     - Select display mode between default and paginated
 */
export const Repeater = () => {};
