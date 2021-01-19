import os
import yaml
import sys

thismodule = sys.modules[__name__]

samples_path = os.path.join(os.path.dirname(__file__), '../', 'static/samples/')
cases_path = os.path.join(os.path.dirname(__file__), 'cases/')

"""
    wrapper for scenarios = []

    each scenario should be a dict
    {scenario_name: [
            (action, data),
            ...
    ]}
    if data is empty put {}

    Example:

    {'xxx_scenario': [
        ('action', {
            'data1':1,
        }),
        ('action2', {
            'data2':2,
        }),
        ('action3', {}),
    ]}
"""

# def get_scenarios():
scenarios = []

# scenario description
scenarios.append({'test_common_scenario': [
    ('prepare', {}),
    ('config', {
        'label_config': """
                <View>
                    <Text name="text" value="$text"/>
                    <Choices name="sentiment" toName="text" choice="single">
                        <Choice value="Positive"/>
                        <Choice value="Negative"/>
                        <Choice value="Neutral"/>
                    <Choice value="YYY"/>
                    </Choices>
                </View>""",
    }),
    ('import', {
        'filepath': samples_path,
        'filename': 'lorem_ipsum.txt',
    }),
    ('get_task', {
        'task_id': 0,
    }),
    ('label', {
        'task_id': 0,
        'completion': {
            "lead_time": 474.108,
            "result": [{
                "id": "_qRv9kaetd",
                "from_name": "sentiment",
                "to_name": "text",
                "type": "choices",
                "value": {"choices": ["Neutral"]}
            }]
        },
    }),
    ('export', {'format': 'JSON'})
]})

# get yaml scenarios from cases_path
# possible to pass named variables as
# attr: $variable_name
# and put variable_name = variable in this module
for filepath in os.listdir(cases_path):
    with open(os.path.join(cases_path, filepath)) as file:
        datadoc = yaml.load_all(file, Loader=yaml.FullLoader)
        for datamap in datadoc:
            name = datamap.get('scenario')
            yaml_actions = datamap.get('actions')
            actions = []
            for a_name, a_attrs in yaml_actions.items():
                if a_attrs == None:
                    a_attrs = {}
                for attr_name, attr_val in a_attrs.items():
                    if isinstance(attr_val, str) and attr_val.startswith('$'):
                        attr_val = attr_val.strip('$')
                        a_attrs[attr_name] = thismodule.__getattribute__(attr_val)
                a = (a_name, a_attrs)
                actions.append(a)
            res = {name: actions}

            scenarios.append(res)
