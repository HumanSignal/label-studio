import drf_yasg.openapi as openapi

result_example = [
    {
        'original_width': 1920,
        'original_height': 1080,
        'image_rotation': 0,
        'from_name': 'bboxes',
        'to_name': 'image',
        'type': 'rectanglelabels',
        'value': {
            'x': 20,
            'y': 30,
            'width': 50,
            'height': 60,
            'rotation': 0,
            'values': {'rectanglelabels': ['Person']},
        },
    }
]

task_response_example = {
    'id': 1,
    'data': {'image': 'https://example.com/image.jpg', 'text': 'Hello, AI!'},
    'project': 1,
    'created_at': '2024-06-18T23:45:46.048490Z',
    'updated_at': '2024-06-18T23:45:46.048538Z',
    'is_labeled': False,
    'overlap': 1,
    'inner_id': 1,
    'total_annotations': 0,
    'cancelled_annotations': 0,
    'total_predictions': 0,
    'comment_count': 0,
    'unresolved_comment_count': 0,
    'last_comment_updated_at': '2024-01-15T09:30:00Z',
    'updated_by': [{'user_id': 1}],
    'file_upload': '42d46c4c-my-pic.jpeg',
    'comment_authors': [1],
}

dm_task_response_example = {
    'id': 13,
    'predictions': [],
    'annotations': [],
    'drafts': [],
    'annotators': [],
    'inner_id': 2,
    'cancelled_annotations': 0,
    'total_annotations': 0,
    'total_predictions': 0,
    'completed_at': None,
    'annotations_results': '',
    'predictions_results': '',
    'predictions_score': None,
    'file_upload': '6b25fc23-some_3.mp4',
    'storage_filename': None,
    'annotations_ids': '',
    'predictions_model_versions': '',
    'avg_lead_time': None,
    'draft_exists': False,
    'updated_by': [],
    'data': {'image': '/data/upload/1/6b25fc23-some_3.mp4'},
    'meta': {},
    'created_at': '2024-06-18T23:45:46.048490Z',
    'updated_at': '2024-06-18T23:45:46.048538Z',
    'is_labeled': False,
    'overlap': 1,
    'comment_count': 0,
    'unresolved_comment_count': 0,
    'last_comment_updated_at': None,
    'project': 1,
    'comment_authors': [],
}

annotation_response_example = {
    'id': 1,
    'result': result_example,
    'task': 1,
    'project': 1,
    'completed_by': 1,
    'updated_by': 1,
    'was_cancelled': False,
    'ground_truth': False,
    'lead_time': 10,
}

prediction_response_example = {'id': 1, 'task': 1, 'result': result_example, 'score': 0.95, 'model_version': 'yolo-v8'}

task_request_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'data': openapi.Schema(
            title='Task data',
            description='Task data dictionary with arbitrary keys and values',
            type=openapi.TYPE_OBJECT,
            example={'image': 'https://example.com/image.jpg', 'text': 'Hello, world!'},
        ),
        'project': openapi.Schema(
            type=openapi.TYPE_INTEGER,
            description='Project ID',
        ),
    },
    example={
        'data': {'image': 'https://example.com/image.jpg', 'text': 'Hello, world!'},
        'project': 1,
    },
)

annotation_request_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'result': openapi.Schema(
            type=openapi.TYPE_ARRAY,
            items=openapi.Schema(
                type=openapi.TYPE_OBJECT,
            ),
            description='Labeling result in JSON format. Read more about the format in [the Label Studio documentation.](https://labelstud.io/guide/task_format)',
            example=result_example,
        ),
        'task': openapi.Schema(type=openapi.TYPE_INTEGER, description='Corresponding task for this annotation'),
        'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID for this annotation'),
        'completed_by': openapi.Schema(
            type=openapi.TYPE_INTEGER, description='User ID of the person who created this annotation'
        ),
        'updated_by': openapi.Schema(type=openapi.TYPE_INTEGER, description='Last user who updated this annotation'),
        'was_cancelled': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='User skipped the task'),
        'ground_truth': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='This annotation is a Ground Truth'),
        'lead_time': openapi.Schema(
            type=openapi.TYPE_NUMBER,
            description='How much time it took to annotate the task (in seconds)',
            example=100.5,
        ),
    },
    required=[],
    example={
        'result': result_example,
        'was_cancelled': False,
        'ground_truth': True,
    },
)

prediction_request_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'task': openapi.Schema(
            type=openapi.TYPE_INTEGER,
            description='Task ID for which the prediction is created',
        ),
        'result': openapi.Schema(
            type=openapi.TYPE_ARRAY,
            items=openapi.Schema(
                type=openapi.TYPE_OBJECT,
            ),
            description='Prediction result in JSON format. Read more about the format in [the Label Studio documentation.](https://labelstud.io/guide/predictions)',
            example=result_example,
        ),
        'score': openapi.Schema(
            type=openapi.TYPE_NUMBER,
            description='Prediction score. Can be used in Data Manager to sort task by model confidence. '
            'Task with the lowest score will be shown first.',
            example=0.95,
        ),
        'model_version': openapi.Schema(
            type=openapi.TYPE_STRING,
            description='Model version - tag for predictions that can be used to filter tasks in Data Manager, as well as '
            'select specific model version for showing preannotations in the labeling interface',
            example='yolo-v8',
        ),
    },
    example={'result': result_example, 'score': 0.95, 'model_version': 'yolo-v8'},
)
