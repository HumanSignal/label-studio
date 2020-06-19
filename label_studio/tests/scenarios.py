import os


samples_path = os.path.join(os.path.dirname(__file__), '../','static/samples/')


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
scenarios = [
# scenario description
{'test_common_scenario': [
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
            }),
        ('export', {'format':'JSON'})
]},

]
