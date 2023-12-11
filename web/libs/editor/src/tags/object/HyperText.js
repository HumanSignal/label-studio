// stub file to keep docs for HyperText object tag

/**
 * The `HyperText` tag displays hypertext markup for labeling. Use for labeling HTML-encoded text and webpages for NER and NLP projects.
 *
 * Use with the following data types: HTML.
 * @example
 * <!--Labeling configuration to label HTML content -->
 * <View>
 *   <HyperText name="text-1" value="$text" />
 *   <Labels name="parts" toName="text-1">
 *     <Label value="Caption" />
 *     <Label value="Article" />
 *     <Label value="Author" />
 *   </Labels>
 * </View>
 * @example
 * <View>
 *   <HyperText name="p1">
 *     <p>Some explanations <em>with style</em></p>
 *   </HyperText>
 * </View>
 * @name HyperText
 * @regions HyperTextRegion
 * @meta_title Hypertext Tags for Hypertext Markup (HTML)
 * @meta_description Label Studio Hypertext Tags customize Label Studio for hypertext markup (HTML) for machine learning and data science projects.
 * @param {string} name                                   Name of the element
 * @param {string} value                                  Value of the element
 * @param {url|text} [valueType=text]                     Whether the text is stored directly in uploaded data or needs to be loaded from a URL
 * @param {boolean} [inline=false]                        Whether to embed HTML directly in Label Studio or use an iframe
 * @param {yes|no} [saveTextResult]                       Whether to store labeled text along with the results. By default, doesn't store text for `valueType=url`
 * @param {none|base64|base64unicode} [encoding]          How to decode values from encoded strings
 * @param {boolean} [selectionEnabled=true]               Enable or disable selection
 * @param {boolean} [clickableLinks=false]                Whether to allow opening resources from links in the hypertext markup.
 * @param {string} [highlightColor]                       Hex string with highlight color, if not provided uses the labels color
 * @param {boolean} [showLabels]                          Whether or not to show labels next to the region; unset (by default) — use editor settings; true/false — override settings
 * @param {symbol|word|sentence|paragraph} [granularity]  Control region selection granularity
 */
export const HyperTextModel = {};
