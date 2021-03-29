"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
"""
this script
generates
tasks_and_annotations json file
with random label_choices

to be bulk imported in project
"""

import random as r
import os

task_template_start = """{"id": %s,"predictions":[],"annotations":["""

label_choices = ["Neutral", "Positive", "Negative"]

tc_template = """{"id": %s,"review_result":null,"ground_truth":false,"result":[{"id":"MGK92Ogo4t","type":"choices","value":{"choices":["%s"]},"to_name":"text","from_name":"sentiment"}],"created_at":"2020-07-06T07:55:08.250617Z","updated_at":"2020-07-06T07:55:08.250637Z","lead_time":79.583,"completed_by":%s}"""

task_template_end = """],"data":{"text":"Но тут же раздался ужасный голос во мгле", "meta_info":"meta A"},"meta":{},"accuracy":1.0,"created_at":"2020-06-26T12:59:15.457035Z","updated_at":"2020-07-06T10:47:48.997310Z","is_labeled":true,"overlap":2,"project":2}"""


def gen_tasks(user_id):
    i = 11
    tasks_n = 1000

    j = 80
    annotations_n = 5

    tasks = []
    for t in range(tasks_n):
        tasks.append(task_template_start % i)
        for c in range(annotations_n):
            tasks.append(tc_template % (j, r.choices(label_choices)[0], user_id))
            if c < annotations_n - 1:
                tasks.append(',')
            j += 1
        tasks.append(task_template_end)
        if t < tasks_n - 1:
            tasks.append(',')
        i += 1

    with open(os.path.join(os.path.dirname(__file__), 'tasks_and_annotations.json'), 'w+', encoding='utf-8') as f:
        f.write('[' + ''.join(tasks) + ']')


if __name__ == '__main__':
    gen_tasks(3)
