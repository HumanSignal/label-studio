
## Test tutorial


### structure

- functional tests
    --pytest
- smoke tests
    --pytest write "actions" for simple real actions (endpoints, and core)
- e2e tests
    --pytest parametrize fixture
    --combination of actions and data


### important

e2e_actions - contains action functions

e2e_test.ACTIONS - mapping 'action_name': action_function

e2e_test.TestCase - runner for scenarios

scenarios.scenarios - [] wrapper for scenarios


### how to run tests

```
git clone https://github.com/heartexlabs/label-studio.git
cd label-studio
python -m venv venv
. venv/bin/activate
pip install pytest blinker coverage
pip install -e .
label-studio init my_project
python -m pytest -vrP

```
also you could see test coverage

```
coverage run -m --source=label_studio pytest
coverage report -m
```


## e2e test framework doc

### scenarios
example:

```
scenarios = []

{common_scenario: [
    ('prepare', {}),
    ('import', {
        'source': 'local',
        'filepath': samples_path,
        'filename': 'lorem_ipsum.txt',
        }),
    ('get_task', {
            'task_id': 0,
        }),
    ('export', {'format':'JSON'}),
]}

scenarios.append( ... )
```

### actons with arguments
\* means - look below for data examples

| actions | data arguments | example |
| ------ | ------ | ------ |
| `prepare` |  |  |
| `config` | label_config | * |
| `import` | filepath | * |
|  | filename | 'lorem_ipsum.txt'|
| `get_task` | task_id | 1 |
| `label` | completion | * |


### action data examples
```
samples_path = os.path.join(os.path.dirname(__file__), '../','static/samples/')

'label_config': """<View>
    <Text name="text" value="$text"/>
    <Choices name="sentiment" toName="text" choice="single">
        <Choice value="Positive"/>
        <Choice value="Negative"/>
        <Choice value="Neutral"/>
    <Choice value="YYY"/>
    </Choices>
</View>"""
                
'completion' : {
    "lead_time":474.108,
    "result": [{
            "id":"_qRv9kaetd",
            "from_name":"sentiment",
            "to_name":"text",
            "type":"choices",
            "value":{"choices":["Neutral"]}
        }]
},
```













