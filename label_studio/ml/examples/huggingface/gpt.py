from transformers import AutoTokenizer, AutoModelForCausalLM
from lxml import etree

from label_studio.ml import LabelStudioMLBase
from label_studio.ml.utils import get_single_tag_keys


class DialoGPTSimpleGenerator(LabelStudioMLBase):

    def __init__(self, num_responses=5, model='microsoft/DialoGPT-small', **kwargs):
        super(DialoGPTSimpleGenerator, self).__init__(**kwargs)

        self.num_return_sequences = num_responses
        self.top_k = num_responses
        self.model_name = model

        self.from_name, self.to_name, self.value, self.labels_in_config = get_single_tag_keys(
            self.parsed_label_config, 'TextArea', 'Paragraphs')
        config = etree.fromstring(self.label_config)
        paragraphs = config.find('.//Paragraphs')
        self.name_key = paragraphs.get('nameKey') or paragraphs.get('namekey') or 'author'
        self.text_key = paragraphs.get('textKey') or paragraphs.get('textkey') or 'text'

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForCausalLM.from_pretrained(self.model_name)

    def _run_generator(self, texts):
        entire_dialog = self.tokenizer.eos_token.join(texts) + self.tokenizer.eos_token

        input_ids = self.tokenizer.encode(entire_dialog, return_tensors='pt')

        # generated a response while limiting the total chat history to 1000 tokens,
        chat_history_ids = self.model.generate(
            input_ids, max_length=1000, pad_token_id=self.tokenizer.eos_token_id,
            num_return_sequences=self.num_return_sequences,
            top_k=self.top_k,
            do_sample=True
        )

        responses = []
        for i in range(self.num_return_sequences):
            response_ids = chat_history_ids[:, input_ids.shape[-1]:][i]
            response = self.tokenizer.decode(response_ids, skip_special_tokens=True)
            if response:
                responses.append(response)
        return responses

    def predict(self, tasks, **kwargs):
        assert len(tasks) == 1
        dialogue = tasks[0]['data'][self.value]
        texts = [item[self.text_key] for item in dialogue]
        responses = self._run_generator(texts)
        return [{
            'result': [{
                'from_name': self.from_name,
                'to_name': self.to_name,
                'type': 'textarea',
                'value': {
                    'text': responses
                }
            }]
        }]

    def fit(self, completions, workdir=None, **kwargs):
        return {}
