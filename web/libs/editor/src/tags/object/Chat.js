/**
 * The `Chat` tag displays a conversational transcript and lets annotators
 * extend it with new messages during labeling. The initial transcript is
 * provided from task data via the `value` attribute.
 *
 * Optionally, the tag can request automatic replies from an LLM model. To do so,
 * set the `llm` attribute to a model in the format `<provider>/<model>`.
 *
 * Messages can be edited by clicking the edit button that appears on hover for
 * user-created messages (messages from annotation results). System messages from
 * task data cannot be edited.
 *
 * Use with the following data types: JSON array of message objects.
 *
 * Message object format (task data):
 * - `role`    — speaker identifier; supported roles: `user`, `assistant`, `system`, `tool`, `developer`
 * - `content` — message text
 *
 * Example task data:
 * ```json
 * {
 *   "dialog": [
 *     {"role": "system", "content": "Welcome to the assistant."},
 *     {"role": "user", "content": "Hello!"}
 *   ]
 * }
 * ```
 *
 * @example
 * <View>
 *   <Chat name="chat" value="$dialog" />
 * </View>
 *
 * @example
 * <View>
 *   <!-- Allow composing both user and assistant messages; auto-reply using an LLM model -->
 *   <Chat
 *     name="conversation" value="$dialog"
 *     messageroles="user,assistant" llm="openai/gpt-5"
 *     minMessages="4" maxMessages="20"
 *     editable="user,assistant"
 *   />
 * </View>
 *
 * @name Chat
 * @meta_title Chat Tag for Conversational Transcripts
 * @meta_description Display and extend chat transcripts; optionally request assistant replies from an LLM. Supports message editing controls and min/max limits.
 *
 * @param {string} name                 Name of the element
 * @param {string} value                Data field containing an array of chat messages or empty array
 * @param {string} [messageroles]       Comma-separated list of roles that the user can create and send messages on behalf of. Default is "user" if the `llm` parameter is set; default is "user,assistant" if not.
 * @param {boolean|string} [editable]   Whether messages are editable. Use true/false, or a comma-separated list of roles that are editable
 * @param {string|number} [minmessages] Minimum total number of messages required to submit
 * @param {string|number} [maxmessages] Maximum total number of messages allowed
 * @param {string} [llm]                Model used to enable automatic assistant replies, format: `<provider>/<model>`
 */

export const ChatModel = {};
