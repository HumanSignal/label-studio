import io
import json
import os
import spacy

from operator import itemgetter
from glob import glob

nlp = spacy.load('en_core_web_sm')


def tokenize(text):
  return [(tok.text, tok.idx) for tok in nlp(text)]


def create_tokens_and_tags(text, spans):
  tokens_and_idx = tokenize(text)
  spans = list(sorted(spans, key=itemgetter('start')))
  span = spans.pop(0)
  prefix = 'B-'
  tokens, tags = [], []
  for token, token_start in tokens_and_idx:
    tokens.append(token)
    token_end = token_start + len(token) - 1
    if not span or token_end < span['start']:
      tags.append('O')
    elif token_start > span['end']:
      # this could happen if prev label ends with whitespaces, e.g. "cat " "too"
      # TODO: it is not right choice to place empty tag here in case when current token is covered by next span  # noqa
      tags.append('O')
    else:
      tags.append(f'{prefix}{span["labels"][0]}')
      if span['end'] > token_end:
        prefix = 'I-'
      elif len(spans):
        span = spans.pop(0)
        prefix = 'B-'
      else:
        span = None

  return tokens, tags


def iter_tokens_tags(input_dir):
  for datafile in glob(os.path.join(input_dir, '*.json')):
    with io.open(datafile) as f:
      data = json.load(f)
    text = data['data']['text']
    result = data['completions'][0]['result']
    spans = list(map(itemgetter('value'), result))

    tokens, tags = create_tokens_and_tags(text, spans)
    yield tokens, tags
