import os

from mmdet.apis import init_detector, inference_detector

from label_studio.ml import LabelStudioMLBase
from label_studio.ml.utils import get_image_local_path, get_image_size
from label_studio.utils.io import json_load


class MMDetection(LabelStudioMLBase):
    """Object detector based on https://github.com/open-mmlab/mmdetection"""

    def __init__(self, config_file, checkpoint_file, labels_file=None, score_threshold=0.3, device='cpu', **kwargs):
        """
        Load MMDetection model from config and checkpoint into memory.
        (Check https://mmdetection.readthedocs.io/en/v1.2.0/GETTING_STARTED.html#high-level-apis-for-testing-images)

        Optionally set mappings from COCO classes to target labels
        :param config_file: Absolute path to MMDetection config file (e.g. /home/user/mmdetection/configs/faster_rcnn/faster_rcnn_r50_fpn_1x.py)
        :param checkpoint_file: Absolute path MMDetection checkpoint file (e.g. /home/user/mmdetection/checkpoints/faster_rcnn_r50_fpn_1x_20181010-3d1b3351.pth)
        :param labels_file: file with mappings from COCO labels to custom labels {"airplane": "Boeing"}
        :param score_threshold: score threshold to wipe out noisy results
        :param device: device (cpu, cuda:0, cuda:1, ...)
        :param kwargs:
        """
        super(MMDetection, self).__init__(**kwargs)

        self.config_file = config_file
        self.checkpoint_file = checkpoint_file
        self.labels_file = labels_file
        if self.labels_file and os.path.exists(self.labels_file):
            self.label_map = json_load(self.labels_file)
        else:
            self.label_map = {}

        from_name, schema = list(self.parsed_label_config.items())[0]
        self.from_name = from_name
        self.to_name = schema['to_name'][0]
        self.labels_in_config = set(schema['labels'])

        # Collect label maps from `predicted_values="airplane,car"` attribute in <Label> tag
        self.labels_attrs = schema.get('labels_attrs')
        if self.labels_attrs:
            for label_name, label_attrs in self.labels_attrs.items():
                for predicted_value in label_attrs.get('predicted_values', '').split(','):
                    self.label_map[predicted_value] = label_name

        print('Load new model from: ', config_file, checkpoint_file)
        self.model = init_detector(config_file, checkpoint_file, device=device)
        self.score_thresh = score_threshold

    def predict(self, tasks, **kwargs):
        assert len(tasks) == 1
        task = tasks[0]
        image_path = get_image_local_path(task['data']['image_url'])
        model_results = inference_detector(self.model, image_path)
        results = []
        all_scores = []
        img_width, img_height = get_image_size(image_path)
        for bboxes, label in zip(model_results, self.model.CLASSES):
            output_label = self.label_map.get(label, label)

            if output_label not in self.labels_in_config:
                print(output_label + ' label not found in project config.')
                continue
            for bbox in bboxes:
                bbox = list(bbox)
                if not bbox:
                    continue
                score = float(bbox[-1])
                if score < self.score_thresh:
                    continue
                x, y, xmax, ymax = bbox[:4]
                results.append({
                    'from_name': self.from_name,
                    'to_name': self.to_name,
                    'type': 'rectanglelabels',
                    'value': {
                        'rectanglelabels': [output_label],
                        'x': int(x / img_width * 100),
                        'y': int(y / img_height * 100),
                        'width': int((xmax - x) / img_width * 100),
                        'height': int((ymax - y) / img_height * 100)
                    },
                    'score': score
                })
                all_scores.append(score)
        avg_score = sum(all_scores) / len(all_scores)
        return [{
            'result': results,
            'score': avg_score
        }]

    def fit(self, completions, workdir=None, **kwargs):
        return {}
