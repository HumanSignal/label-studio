
## Test tutorial
![code-coverage](https://github.com/heartexlabs/label-studio/.github/test-coverage.svg)


### Structure

- functional tests
    --pytest
- smoke tests
    --pytest write "actions" for simple real actions (endpoints, and core)
- e2e tests
    --pytest parametrize fixture
    --combination of actions and data


### Important

e2e_actions - contains action functions

e2e_test.ACTIONS - mapping 'action_name': action_function

e2e_test.TestCase - runner for scenarios

scenarios.scenarios - [] wrapper for scenarios




### How to run tests

```
git clone https://github.com/heartexlabs/label-studio.git
cd label-studio
python -m venv venv
. venv/bin/activate
pip install -e .
pip install -r label_studio/tests/requirements.txt
label-studio init my_project
python -m pytest -vrP
```

also you could see test coverage

```
coverage run -m --source=label_studio pytest
coverage report -m
```

generate test coverage BADGE<br/>
after merging all Pull Requests into release/x-y-z branch<br/>
generate badge<br/>
and commit to release/x-y-z<br/>
before merge to master<br/>

```
pip install coverage-badge
coverage-badge -o .github/test-coverage.svg
```


## e2e test framework doc

### Scenarios
scenario can be written as<br/>
1) python code (manually append)<br/>
2) yaml single-doc / multi-doc file in tests/cases<br/>

examples:

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

you can use $variable in yaml<br/>
that corresponds to python variable = value in scenarios<br/>
example - $samples_path<br/>

```
scenario: 'complex_case_1st_part'
actions:
    prepare:
    config:
        label_config: |
            <View>
                <Text name="text" value="$text"/>
                <Choices name="sentiment" toName="text" choice="single">
                    <Choice value="Positive"/>
                    <Choice value="Negative"/>
                </Choices>
            </View>
    import:
        filepath: $samples_path
        filename: 'lorem_ipsum.txt'
    get_task:
        task_id: 0
    label:
        task_id: 0
        completion : {
            "lead_time":474.108,
            "result": [{
                    "id":"_qRv9kaetd",
                    "from_name":"sentiment",
                    "to_name":"text",
                    "type":"choices",
                    "value":{"choices":["Positive"]}
                }]
            }
---
scenario: 'complex_case_2nd_part'
actions:
    delete_task:
        task_id: 0

```

### Actions with arguments
\* means - look below for data examples<br/>
currently e2e test framework is under development so<br/>
better take a look at e2e_actions code to be sure of desired action<br/>

| actions | data arguments | example |
| ------ | ------ | ------ |
| `prepare` |  |  |
| `config` | label_config | * |
| `import` | filepath | * |
|  | filename | 'lorem_ipsum.txt'|
| `get_task` | task_id | 0 |
| `next_task` |  |  |
| `delete_task` | task_id | 0 |
| `delete_all_tasks` |  |  |
| `cancel_task` | task_id | 0 |
| `label` | task_id | 0 |
|  | completion | * |
| `get_all_completions` | task_id | 0 |
| `change_completion` | task_id | 0 |
|  | completion_id | 0 |
| `export` | format | JSON |


### Action data examples
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
