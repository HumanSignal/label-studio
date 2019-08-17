import os
import json
import io
import logging
import pandas as pd
import xml.dom
import xml.dom.minidom

from enum import Enum, auto
from datetime import datetime
from glob import glob
from collections import Mapping, defaultdict
from operator import itemgetter
from copy import deepcopy

from utils import (
    parse_config, create_tokens_and_tags, download, get_image_size, get_image_size_and_channels, ensure_dir
)


logger = logging.getLogger(__name__)


class FormatNotSupportedError(NotImplementedError):
    pass


class Format(Enum):
    JSON = auto()
    CSV = auto()
    CONLL2003 = auto()
    COCO = auto()
    VOC = auto()

    def __str__(self):
        return self.name

    @classmethod
    def from_string(cls, s):
        try:
            return Format[s]
        except KeyError:
            raise ValueError()


class Converter(object):

    def __init__(self, config_string, output_tags=None):
        self._config_string = config_string
        self._schema = parse_config(config_string)

        self._data_keys, self._output_tags = self._get_data_keys_and_output_tags(output_tags)
        self._supported_formats = self._get_supported_formats()

    def _get_data_keys_and_output_tags(self, output_tags=None):
        data_keys = set()
        output_tag_names = []
        if output_tags is not None:
            for tag in output_tags:
                if tag not in self._schema:
                    logger.warning(
                        f'Specified tag "{tag}" not found in config schema: '
                        f'available options are {list(self._schema.keys())}')
        for name, info in self._schema.items():
            if output_tags is not None and name not in output_tags:
                continue
            new_data_keys = set(map(itemgetter('value'), info['inputs']))
            if not data_keys:
                data_keys |= new_data_keys
            if data_keys != new_data_keys and output_tags is None:
                raise ValueError(
                    f'Input schema for tag {name} differs from other tags: can\'t resolve data keys ambiguity. '
                    f'Check your input tag {json.dumps(info["inputs"], indent=2)}, or explicitly specify which '
                    f'output tag you wan\'t to save by using "output_tag" option')
            output_tag_names.append(name)

        return list(data_keys), output_tag_names

    def _get_supported_formats(self):
        return []

    @property
    def supported_formats(self):
        return self._supported_formats

    def iter_from_dir(self, input_dir):
        if not os.path.exists(input_dir):
            raise FileNotFoundError(f'{input_dir} doesn\'t exist')
        for json_file in glob(os.path.join(input_dir, '*.json')):
            for item in self.iter_from_json_file(json_file):
                yield item

    def iter_from_json_file(self, json_file):
        with io.open(json_file) as f:
            data = json.load(f)
            if isinstance(data, Mapping):
                yield self.load_from_dict(data)
            elif isinstance(data, list):
                return map(self.load_from_dict, data)

    def load_from_dict(self, d):
        if 'completions' not in d:
            raise KeyError(f'Each completions dict item should contain "completions" key, where value is list of dicts')
        if len(d['completions']) != 1:
            raise NotImplementedError(
                f'Currently only one completion could be added per task - we can\'t convert more than one completions, '
                f'but {len(d["completions"])} found in item: {json.dumps(d, indent=2)}')
        inputs = {key: d['data'][key] for key in self._data_keys}
        outputs = defaultdict(list)
        for r in d['completions'][0]['result']:
            if r['from_name'] in self._output_tags:
                v = deepcopy(r['value'])
                v['type'] = self._schema[r['from_name']]['type']
                outputs[r['from_name']].append(v)
        return {
            'input': inputs,
            'output': outputs
        }

    def _check_format(self, fmt):
        pass
        # if fmt not in self._supported_formats:
        #     raise FormatNotSupportedError(
        #         f'{fmt.name} format not supported for current config. Available options are: {self._supported_formats}')

    def _prettify(self, v):
        if len(v) == 1:
            v = v[0]
            if v['type'] == 'Choices' and len(v['choices']) == 1:
                return v['choices'][0]
        else:
            out = []
            for i in v:
                j = deepcopy(i)
                j.pop('type')
                out.append(j)
            return out

    def convert_to_json(self, input_dir, output_file):
        self._check_format(Format.JSON)
        ensure_dir(os.path.dirname(output_file))
        records = []
        for item in self.iter_from_dir(input_dir):
            record = deepcopy(item['input'])
            for name, value in item['output'].items():
                record[name] = self._prettify(value)
            records.append(record)
        with io.open(output_file, mode='w') as fout:
            json.dump(records, fout, indent=2)

    def convert_to_csv(self, input_dir, output_file, **kwargs):
        self._check_format(Format.CSV)
        ensure_dir(os.path.dirname(output_file))
        records = []
        for item in self.iter_from_dir(input_dir):
            record = deepcopy(item['input'])
            for name, value in item['output'].items():
                pretty_value = self._prettify(value)
                record[name] = pretty_value if isinstance(pretty_value, str) else json.dumps(pretty_value)
            records.append(record)

        pd.DataFrame.from_records(records).to_csv(output_file, index=False, **kwargs)

    def convert_to_conll2003(self, input_dir, output_file):
        self._check_format(Format.CONLL2003)
        ensure_dir(os.path.dirname(output_file))
        data_key = self._data_keys[0]
        with io.open(output_file, 'w') as fout:
            fout.write('-DOCSTART- -X- O\n')
            for item in self.iter_from_dir(input_dir):
                tokens, tags = create_tokens_and_tags(
                    text=item['input'][data_key],
                    spans=next(iter(item['output'].values()))
                )
                for token, tag in zip(tokens, tags):
                    fout.write(f'{token} -X- _ {tag}\n')
                fout.write('\n')

    def convert_to_coco(self, input_dir, output_file, output_image_dir=None):
        self._check_format(Format.COCO)
        ensure_dir(os.path.dirname(output_file))
        if output_image_dir is not None:
            ensure_dir(output_image_dir)
        images, categories, annotations = [], [], []
        category_name_to_id = {}
        data_key = self._data_keys[0]
        for item_idx, item in enumerate(self.iter_from_dir(input_dir)):
            image_path = item['input'][data_key]
            if not os.path.exists(image_path):
                if output_image_dir is None:
                    raise FileNotFoundError(
                        f'We can\'t find file by path {image_path}: if it is URL, please specify "output_image_dir"'
                        f'where downloaded images will be stored'
                    )
                try:
                    image_path = download(image_path, output_image_dir)
                except:
                    logger.error(f'Unable to download {image_path}. The item {item} will be skipped', exc_info=True)
                    continue
            width, height = get_image_size(image_path)
            image_id = len(images)
            images.append({
                'width': width,
                'height': height,
                'id': image_id,
                'file_name': image_path
            })
            bboxes = next(iter(item['output'].values()))
            for bbox in bboxes:
                category_name = bbox['rectanglelabels'][0]
                if category_name not in category_name_to_id:
                    category_id = len(categories)
                    category_name_to_id[category_name] = category_id
                    categories.append({
                        'id': category_id,
                        'name': category_name
                    })
                category_id = category_name_to_id[category_name]
                annotation_id = len(annotations)
                x = int(bbox['x'] / 100 * width)
                y = int(bbox['y'] / 100 * height)
                w = int(bbox['width'] / 100 * width)
                h = int(bbox['height'] / 100 * height)
                annotations.append({
                    'id': annotation_id,
                    'image_id': image_id,
                    'category_id': category_id,
                    'segmentation': [],
                    'bbox': [x, y, w, h],
                    'ignore': 0,
                    'iscrowd': 0,
                    'area': w * h
                })

        with io.open(output_file, mode='w') as fout:
            json.dump({
                'images': images,
                'categories': categories,
                'annotations': annotations,
                'info': {
                    'year': datetime.now().year,
                    'version': '1.0',
                    'contributor': 'Label Studio'
                }
            }, fout, indent=2)

    def convert_to_voc(self, input_dir, output_dir, output_image_dir=None):

        ensure_dir(output_dir)
        if output_image_dir is not None:
            ensure_dir(output_image_dir)

        def create_child_node(doc, tag, attr, parent_node):
            child_node = doc.createElement(tag)
            text_node = doc.createTextNode(attr)
            child_node.appendChild(text_node)
            parent_node.appendChild(child_node)

        data_key = self._data_keys[0]

        for item_idx, item in enumerate(self.iter_from_dir(input_dir)):
            image_path = item['input'][data_key]
            annotations_dir = os.path.join(output_dir, 'Annotations')
            if not os.path.exists(annotations_dir):
                os.makedirs(annotations_dir)
            if not os.path.exists(image_path):
                if output_image_dir is None:
                    raise FileNotFoundError(
                        f'We can\'t find file by path {image_path}: if it is URL, please specify "output_image_dir"'
                        f'where downloaded images will be stored'
                    )
                try:
                    image_path = download(image_path, output_image_dir)
                except:
                    logger.error(f'Unable to download {image_path}. The item {item} will be skipped', exc_info=True)
                    continue
            width, height, channels = get_image_size_and_channels(image_path)
            image_name = os.path.splitext(os.path.basename(image_path))[0]
            xml_filepath = os.path.join(annotations_dir, image_name + '.xml')

            my_dom = xml.dom.getDOMImplementation()
            doc = my_dom.createDocument(None, 'annotation', None)
            root_node = doc.documentElement
            create_child_node(doc, 'folder', output_image_dir, root_node)
            create_child_node(doc, 'filename', image_name, root_node)

            source_node = doc.createElement('source')
            create_child_node(doc, 'database', 'MyDatabase', source_node)
            create_child_node(doc, 'annotation', 'COCO2017', source_node)
            create_child_node(doc, 'image', 'flickr', source_node)
            create_child_node(doc, 'flickrid', 'NULL', source_node)
            root_node.appendChild(source_node)
            owner_node = doc.createElement('owner')
            create_child_node(doc, 'flickrid', 'NULL', owner_node)
            create_child_node(doc, 'name', 'Label Studio', owner_node)
            root_node.appendChild(owner_node)
            size_node = doc.createElement('size')
            create_child_node(doc, 'width', str(width), size_node)
            create_child_node(doc, 'height', str(height), size_node)
            create_child_node(doc, 'depth', str(channels), size_node)
            root_node.appendChild(size_node)
            create_child_node(doc, 'segmented', '0', root_node)

            bboxes = next(iter(item['output'].values()))
            for bbox in bboxes:
                name = bbox['rectanglelabels'][0]
                x = int(bbox['x'] / 100 * width)
                y = int(bbox['y'] / 100 * height)
                w = int(bbox['width'] / 100 * width)
                h = int(bbox['height'] / 100 * height)

                object_node = doc.createElement('object')
                create_child_node(doc, 'name', name, object_node)
                create_child_node(doc, 'pose', 'Unspecified', object_node)
                create_child_node(doc, 'truncated', '0', object_node)
                create_child_node(doc, 'difficult', '0', object_node)
                bndbox_node = doc.createElement('bndbox')
                create_child_node(doc, 'xmin', str(x), bndbox_node)
                create_child_node(doc, 'ymin', str(y), bndbox_node)
                create_child_node(doc, 'xmax', str(x + w), bndbox_node)
                create_child_node(doc, 'ymax', str(y + h), bndbox_node)
                object_node.appendChild(bndbox_node)
                root_node.appendChild(object_node)

            with io.open(xml_filepath, mode='w') as fout:
                doc.writexml(fout, addindent='' * 4, newl='\n', encoding='utf-8')
