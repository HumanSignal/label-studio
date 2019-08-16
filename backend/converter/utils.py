import io
import json
import os
import xml.etree.ElementTree
import requests
import hashlib

from operator import itemgetter
from glob import glob
from PIL import Image


def tokenize(text):
    tok_start = 0
    out = []
    for tok in text.split(' '):
        if len(tok):
            out.append((tok, tok_start))
            tok_start += len(tok) + 1
        else:
            tok_start += 1
    return out


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


def download(url, output_dir, filename=None):
    if filename is None:
        filename = hashlib.md5(url.encode()).hexdigest()
    filepath = os.path.join(output_dir, filename)
    r = requests.get(url)
    r.raise_for_status()
    with io.open(filepath, mode='wb') as fout:
        fout.write(r.content)
    return filepath


def get_image_size(image_path):
    return Image.open(image_path).size


def get_image_size_and_channels(image_path):
    i = Image.open(image_path)
    w, h = i.size
    c = len(i.getbands())
    return w, h, c


def ensure_dir(dir_path):
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)


def parse_config(config_string):

    def _is_input_tag(tag):
        return tag.attrib.get('name') and tag.attrib.get('value', '').startswith('$')

    def _is_output_tag(tag):
        return tag.attrib.get('name') and tag.attrib.get('toName')

    xml_tree = xml.etree.ElementTree.fromstring(config_string)

    inputs, outputs = {}, {}
    for tag in xml_tree.iter():
        if _is_input_tag(tag):
            inputs[tag.attrib['name']] = {'type': tag.tag, 'value': tag.attrib['value'].lstrip('$')}
        elif _is_output_tag(tag):
            outputs[tag.attrib['name']] = {'type': tag.tag, 'to_name': tag.attrib['toName'].split(',')}

    for output_tag, tag_info in outputs.items():
        tag_info['inputs'] = []
        for input_tag_name in tag_info['to_name']:
            if input_tag_name not in inputs:
                raise KeyError(f'to_name={input_tag_name} is specified for output tag name={output_tag}, '
                               f'but we can\'t find it among input tags')
            tag_info['inputs'].append(inputs[input_tag_name])

    return outputs
