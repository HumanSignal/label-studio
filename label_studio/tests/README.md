
## Test tutorial


### structure

- functional tests
    --pytest
- smoke tests
    --pytest write "actions" for simple real actions (endpoints, and core)
- e2e tests
    --pytesy parametrize fixture
    --combination of actions and data


e2e_actions - contain action functions

e2e_test.ACTIONS - mapping 'action_name': action_function

e2e_test.TestCase - runner for suits

suits.Scenarios - wrapper for scenarios


example:

```
xxx_scenario = {
    xxx_scenario: {
        'actions':[
            'prepare',
            'config',
            'import',
            'get_task',
            'label',
            'export',
        ],
        'data1': 1,
        'dataN': N,
    }
}
```

