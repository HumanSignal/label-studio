import sys
from collections import OrderedDict

import yaml


def represent_ordereddict(dumper, data):
    value = []

    for item_key, item_value in data.items():
        node_key = dumper.represent_data(item_key)
        node_value = dumper.represent_data(item_value)

        value.append((node_key, node_value))

    return yaml.nodes.MappingNode('tag:yaml.org,2002:map', value)


yaml.add_representer(OrderedDict, represent_ordereddict)


class Regexp(yaml.YAMLObject):
    yaml_tag = '!re_match'

    def __init__(self, regexp):
        self.regexp = regexp

    # def __repr__(self):
    #     return "" % (
    #         self.__class__.__name__, self.name, self.hp, self.ac, self.attacks)


old_test = sys.argv[1]

new_tests_list = []

with open(old_test) as f:
    content = yaml.safe_load(f.read())

    for test in content:
        # print(test)
        new_test = OrderedDict()
        for test_name, test_data in test.items():
            new_test['test_name'] = test_name
            new_test['strict'] = False
            new_test['marks'] = [{'usefixtures': ['django_live_url']}]
            new_stages = [{'type': 'ref', 'id': 'signup'}]
            for stage in test_data:
                for url, stage_data in stage.items():
                    request_data = {'url': '{{django_live_url}}{url}'.format(url=url), 'method': stage_data['method']}

                    content_type = stage_data.get('content_type', None)
                    if 'data' in stage_data:
                        if isinstance(stage_data['data'], dict):
                            for k, v in stage_data['data'].items():
                                if isinstance(v, str) and 'samples' in v:
                                    if 'files' not in request_data:
                                        request_data['files'] = {}
                                    request_data['files'][k] = f'tests/test_suites/{v}'
                                else:
                                    if content_type and 'json' in content_type:
                                        if 'json' not in request_data:
                                            request_data['json'] = {}
                                        request_data['json'][k] = v
                                    else:
                                        if 'data' not in request_data:
                                            request_data['data'] = {}
                                        request_data['data'][k] = v
                        else:
                            if content_type and 'json' in content_type:
                                request_data['json'] = stage_data['data']
                            else:
                                request_data['data'] = stage_data['data']

                    if 'content_type' in stage_data:
                        request_data['headers'] = {'content-type': stage_data['content_type']}

                    response_data = {'status_code': stage_data['status_code']}
                    if 'response' in stage_data and isinstance(stage_data['response'], dict):
                        for k, v in stage_data['response'].items():
                            if isinstance(v, str) and v.startswith('{'):
                                if 'save' not in response_data:
                                    response_data['save'] = {'json': {}}
                                key = v.replace('{', '').replace('}', '')
                                response_data['save']['json'][key] = k
                            else:
                                if 'json' not in response_data:
                                    response_data['json'] = {}
                                response_data['json'][k] = v

                    new_stages.append(
                        {
                            'name': 'stage',
                            'request': request_data,
                            'response': response_data,
                        }
                    )

            new_test['stages'] = new_stages

        new_tests_list.append(new_test)

    for test in new_tests_list:
        print('---')
        print(yaml.dump(test))
