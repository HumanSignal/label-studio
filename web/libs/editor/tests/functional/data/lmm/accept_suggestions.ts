import { LabelStudio } from '@heartexlabs/ls-test/helpers/LSF';

export const llmTextareaConfig = `<View>
  <Style>
    .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }
  </Style>
  <View className="prompt">
    <TextArea name="prompt" toName="text" editable="true" rows="2" maxSubmissions="1" showSubmitButton="false"/>
  </View>
  <Text name="text" value="$text"/>
  <TextArea name="answer" toName="text"/>
</View>`;
export const llmTextareaData = { text: 'Some simple text' };

export const LLM_WHAT_DO_YOU_SEE = {
  prompt: 'What do you see?',
  answer: 'I see your question!',
};
export const LLM_WHAT_ELSE_DO_YOU_SEE = {
  prompt: 'What else do you see?',
  answer: 'Oh! I see some simple text!',
};
export const llmTextareaSuggestions = {
  [LLM_WHAT_DO_YOU_SEE.prompt]:
        [
          {
            'from_name': 'prompt',
            'id': 'ID_FROM_ML_PROMPT_1',
            'to_name': 'text',
            'type': 'textarea',
            'value': {
              'text': [
                LLM_WHAT_DO_YOU_SEE.prompt,
              ],
            },
          },
          {
            'from_name': 'answer',
            'id': 'ID_FROM_ML_ANSWER_1',
            'to_name': 'text',
            'type': 'textarea',
            'value': {
              'text': [
                LLM_WHAT_DO_YOU_SEE.answer,
              ],
            },
          },
        ],
  [LLM_WHAT_ELSE_DO_YOU_SEE.prompt]: [
    {
      'from_name': 'prompt',
      'id': 'ID_FROM_ML_PROMPT_2',
      'to_name': 'text',
      'type': 'textarea',
      'value': {
        'text': [
          LLM_WHAT_ELSE_DO_YOU_SEE.prompt,
        ],
      },
    },
    {
      'from_name': 'answer',
      'id': 'ID_FROM_ML_ANSWER_2',
      'to_name': 'text',
      'type': 'textarea',
      'value': {
        'text': [
          LLM_WHAT_ELSE_DO_YOU_SEE.answer,
        ],
      },
    },
  ],
};
