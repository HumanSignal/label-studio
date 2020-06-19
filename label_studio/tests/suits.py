import os


samples_path = os.path.join(os.path.dirname(__file__), '../','static/samples/')


class Scenarios:
    """
        wrapper class for scenarios

        each scenario should be a dict
        with the same name

        xxx_scenario = {
            xxx_scenario: {
                'actions':[],
                'data1': 1,
                'dataN': N,
            }
        }
    """

    test_common_scenario = {
        # Test most common scenario
        'test_common_scenario': {
            'actions':[
                'prepare',
                'config',
                'import',
                'get_task',
                'label',
                'export',
            ],
            'label_config': """
                <View>
                    <Text name="text" value="$text"/>
                    <Choices name="sentiment" toName="text" choice="single">
                        <Choice value="Positive"/>
                        <Choice value="Negative"/>
                        <Choice value="Neutral"/>
                    <Choice value="YYY"/>
                    </Choices>
                </View>
                """,
            'source': 'local',
            'filepath': samples_path,
            'filename': 'lorem_ipsum.txt',
            'label_data' : {
                "lead_time":474.108,
                "result": [{
                        "id":"_qRv9kaetd",
                        "from_name":"sentiment",
                        "to_name":"text",
                        "type":"choices",
                        "value":{"choices":["Neutral"]}
                    }]
            },
        }
    }

    test_second_scenario = {
        # short description of scenario
        'test_second_scenario': {
            'actions':[
                'prepare',
                'config',
                'import',
                'get_task',
                'label',
                'export',
            ],
            'label_config': """
                <View>
                    <Text name="text" value="$text"/>
                    <Choices name="sentiment" toName="text" choice="single">
                        <Choice value="Positive"/>
                        <Choice value="Negative"/>
                        <Choice value="Neutral"/>
                    <Choice value="YYY"/>
                    </Choices>
                </View>
                """,
            'source': 'local',
            'filepath': samples_path,
            'filename': 'lorem_ipsum.txt',
            'label_data' : {
                "lead_time":474.108,
                "result": [{
                        "id":"_qRv9kaetd",
                        "from_name":"sentiment",
                        "to_name":"text",
                        "type":"choices",
                        "value":{"choices":["Neutral"]}
                    }]
            },
        }
    }
