# source: https://labelstud.io/guide/tasks.html#Basic-Label-Studio-JSON-format
LABEL_CONFIG_AND_TASKS = {
    'label_config': """
    <View>
    <Text name="message" value="$my_text"/>
    <Choices name="sentiment_class" toName="message">
        <Choice value="Positive"/>
        <Choice value="Neutral"/>
        <Choice value="Negative"/>
    </Choices>
    </View>
    """,
    'tasks_for_import': [
        {
            'data': {
                'my_text': 'Opossums are great',
                'ref_id': 456,
                'meta_info': {'timestamp': '2020-03-09 18:15:28.212882', 'location': 'North Pole'},
            },
            'annotations': [
                {
                    'result': [
                        {
                            'from_name': 'sentiment_class',
                            'to_name': 'message',
                            'type': 'choices',
                            'readonly': False,
                            'hidden': False,
                            'value': {'choices': ['Positive']},
                        }
                    ]
                }
            ],
            'predictions': [
                {
                    'result': [
                        {
                            'from_name': 'sentiment_class',
                            'to_name': 'message',
                            'type': 'choices',
                            'readonly': False,
                            'hidden': False,
                            'value': {'choices': ['Neutral']},
                        }
                    ],
                    'score': 0.95,
                }
            ],
        }
    ],
}
