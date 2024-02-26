// stub file to keep docs for Text object tag

/**
 * The `Text` tag shows text that can be labeled. Use to display any type of text on the labeling interface.
 * You can use `<Style>.htx-text{ white-space: pre-wrap; }</Style>` to preserve all spaces in the text, otherwise spaces are trimmed when displayed and saved in the results. 
 * Every space in the text sample is counted when calculating result offsets, for example for NER labeling tasks.
 *
 * Use with the following data types: text.
 * @example
 * <!--Labeling configuration to label text for NER tasks with a word-level granularity -->
 * <View>
 *   <Text name="text-1" value="$text" granularity="word" highlightColor="#ff0000" />
 *   <Labels name="ner" toName="text-1">
 *     <Label value="Person" />
 *     <Label value="Location" />
 *   </Labels>
 * </View>
 * @example
 * <Text name="p1">Some simple text with explanations</Text>
 * @name Text
 * @regions TextRegion
 * @meta_title Text Tags for Text Objects
 * @meta_description Customize Label Studio with the Text tag to annotate text for NLP and NER machine learning and data science projects.
 * @param {string} name                                   Name of the element
 * @param {string} value                                  Data field containing text or a UR
 * @param {url|text} [valueType=text]                     Whether the text is stored directly in uploaded data or needs to be loaded from a URL
 * @param {yes|no} [saveTextResult]                       Whether to store labeled text along with the results. By default, doesn't store text for `valueType=url`
 * @param {none|base64|base64unicode} [encoding]          How to decode values from encoded strings
 * @param {boolean} [selectionEnabled=true]               Enable or disable selection
 * @param {string} [highlightColor]                       Hex string with highlight color, if not provided uses the labels color
 * @param {boolean} [showLabels]                          Whether or not to show labels next to the region; unset (by default) — use editor settings; true/false — override settings
 * @param {symbol|word|sentence|paragraph} [granularity]  Control region selection granularity
 */
export const TextModel = {};
